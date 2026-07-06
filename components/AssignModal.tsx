import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Eye, Repeat, Lightbulb, CheckCircle, Copy, ShieldAlert, Monitor, CopyX, Expand, Laptop, HelpCircle, CheckSquare, Shuffle } from 'lucide-react';
import { useStore } from '../store';
import { Exam, Assignment } from '../types';

interface Props {
  exam: Exam;
  isOpen: boolean;
  onClose: () => void;
}

export const AssignModal: React.FC<Props> = ({ exam, isOpen, onClose }) => {
  const { classes, users, user, addAssignment } = useStore();

  // Form State
  const [selectedClassId, setSelectedClassId] = useState('');
  const [startTimeDate, setStartTimeDate] = useState('');
  const [startTimeHour, setStartTimeHour] = useState('00:00');
  const [endTimeDate, setEndTimeDate] = useState('');
  const [endTimeHour, setEndTimeHour] = useState('00:00');
  const [duration, setDuration] = useState(exam.durationMinutes || 0);
  const [successLink, setSuccessLink] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSuccessLink('');
      setCopied(false);
      setSelectedClassId('');
      setStartTimeDate('');
      setStartTimeHour('00:00');
      setEndTimeDate('');
      setEndTimeHour('00:00');
      setDuration(exam.durationMinutes || 0);
      setViewScore(true);
      setViewPassFail(true);
      setViewSolution(true);
      setViewHint(true);
      setMaxAttempts(10);
      setSelectedStudentIds([]); // Reset student selection
      setShuffleQuestions(true); // Reset shuffle questions
      setShuffleQuestionsMode('by_level'); // Reset shuffle mode to by_level
    }
  }, [isOpen, exam]);

  // Settings
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [viewScore, setViewScore] = useState(true);
  const [viewPassFail, setViewPassFail] = useState(true);
  const [viewSolution, setViewSolution] = useState(true);
  const [viewSolutionOnLastAttemptOnly, setViewSolutionOnLastAttemptOnly] = useState(false);
  const [viewHint, setViewHint] = useState(true); // New Hint Setting
  const [maxAttempts, setMaxAttempts] = useState(10); // Default 10 attempts
  const [caseSensitiveShortAnswer, setCaseSensitiveShortAnswer] = useState(false);
  const [shuffleQuestions, setShuffleQuestions] = useState(true); // Shuffle questions toggle
  const [shuffleQuestionsMode, setShuffleQuestionsMode] = useState<'random' | 'by_level'>('by_level'); // Shuffle mode state

  // Security Settings
  const [mode, setMode] = useState<'practice' | 'exam'>('practice');
  const [requireCamera, setRequireCamera] = useState(false);
  const [requireFullscreen, setRequireFullscreen] = useState(false);
  const [preventTabSwitch, setPreventTabSwitch] = useState(false);
  const [preventCopy, setPreventCopy] = useState(false);

  // Auto-configure security based on mode
  useEffect(() => {
    if (mode === 'exam') {
      setRequireFullscreen(true);
      setPreventTabSwitch(true);
      setPreventCopy(true);
      setRequireCamera(false); // Make it optional even in exam mode, but recommended
    }
  }, [mode]);

  if (!isOpen) return null;

  // Filter classes taught by this teacher
  const teacherClasses = classes.filter(c => c.teacherId === user?.id);

  const handleAssign = () => {
    if (!selectedClassId) {
      alert("Vui lòng chọn lớp!");
      return;
    }

    const newAssignment: Assignment = {
      id: `assign_${Date.now()}`,
      examId: exam.id,
      classId: selectedClassId,
      teacherId: user?.id || '',
      createdAt: new Date().toISOString(),
      startTime: startTimeDate ? new Date(`${startTimeDate}T${startTimeHour || '00:00'}`).toISOString() : undefined,
      endTime: endTimeDate ? new Date(`${endTimeDate}T${endTimeHour || '00:00'}`).toISOString() : undefined,
      durationMinutes: duration,
      studentIds: selectedStudentIds.length > 0 ? selectedStudentIds : undefined,
      mode: mode,
      settings: {
        viewScore,
        viewPassFail,
        viewSolution,
        viewSolutionOnLastAttemptOnly,
        viewHint,
        maxAttempts,
        caseSensitiveShortAnswer,
        shuffleQuestions,
        shuffleQuestionsMode,
        // Enforce settings if it's exam mode, otherwise take custom state
        requireFullscreen: mode === 'exam' ? true : requireFullscreen,
        preventTabSwitch: mode === 'exam' ? true : preventTabSwitch,
        preventCopy: mode === 'exam' ? true : preventCopy,
        requireCamera
      }
    };

    addAssignment(newAssignment);
    const link = `${window.location.origin}/exam/${exam.id}/take?assign=${newAssignment.id}`;
    setSuccessLink(link);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg animate-fade-in border border-gray-100 dark:border-slate-800">
        <div className="p-5 border-b dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 rounded-t-xl">
          <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">Giao bài: {exam.title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X className="h-5 w-5 text-gray-900 dark:text-slate-300" />
          </button>
        </div>

        {successLink ? (
          <div className="p-8 text-center bg-white dark:bg-slate-900 space-y-6">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-950/40 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100">Giao bài thành công!</h3>
            <p className="text-gray-600 dark:text-slate-300">Bài kiểm tra đã được giao. Bạn có thể sao chép đường dẫn bên dưới để gửi cho học sinh đăng nhập và làm bài.</p>

            <div className="flex items-center gap-2 mt-6 bg-gray-50 dark:bg-slate-950 p-3 rounded-lg border border-gray-300 dark:border-slate-800">
              <input
                type="text"
                readOnly
                value={successLink}
                className="flex-1 bg-transparent border-none outline-none text-sm text-gray-700 dark:text-slate-300 font-mono truncate"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(successLink);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="px-4 py-2 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900 font-medium rounded-md transition-colors text-sm flex items-center gap-2 flex-shrink-0"
              >
                {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Đã chép" : "Copy"}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto bg-white dark:bg-slate-900">
            {/* Class Selection */}
            <div>
              <label className="block text-sm font-bold text-gray-900 dark:text-slate-100 mb-2">Chọn lớp học</label>
              <select
                value={selectedClassId}
                onChange={e => setSelectedClassId(e.target.value)}
                className="w-full border border-gray-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
              >
                <option value="">-- Chọn lớp để giao bài --</option>
                {teacherClasses.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              {/* Student Selection (Appears only when a class is selected) */}
              {selectedClassId && (
                <div className="mt-4 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-bold text-gray-800 dark:text-slate-300">Chọn học sinh (Tùy chọn)</label>
                    <button 
                      onClick={() => {
                        const cls = classes.find(c => c.id === selectedClassId);
                        if (cls && selectedStudentIds.length === cls.studentIds.length) {
                          setSelectedStudentIds([]); // Deselect all
                        } else if (cls) {
                          setSelectedStudentIds(cls.studentIds); // Select all
                        }
                      }}
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                    >
                      {classes.find(c => c.id === selectedClassId)?.studentIds.length === selectedStudentIds.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                    </button>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {classes.find(c => c.id === selectedClassId)?.studentIds.length === 0 ? (
                      <p className="text-xs text-gray-500 dark:text-slate-400 italic">Lớp học này chưa có học sinh nào.</p>
                    ) : (
                      classes.find(c => c.id === selectedClassId)?.studentIds.map(sid => {
                        const studentUser = users.find(u => u.id === sid);
                        const isChecked = selectedStudentIds.includes(sid);
                        
                        return (
                          <label key={sid} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-md transition-colors">
                            <input 
                              type="checkbox" 
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedStudentIds(prev => [...prev, sid]);
                                } else {
                                  setSelectedStudentIds(prev => prev.filter(id => id !== sid));
                                }
                              }}
                              className="w-4 h-4 rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:bg-slate-950 focus:ring-indigo-500" 
                            />
                            <div className="flex items-center gap-2">
                              {studentUser?.avatar && <img src={studentUser.avatar} alt="" className="w-6 h-6 rounded-full border border-gray-200 dark:border-slate-850" />}
                              <span className="text-sm font-medium text-gray-700 dark:text-slate-300">{studentUser?.name || 'Học sinh ẩn danh'}</span>
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-2 text-center bg-white dark:bg-slate-900 py-1 rounded border border-gray-100 dark:border-slate-800">
                    <Lightbulb className="inline-block w-3 h-3 text-orange-500 mr-1" />
                    <strong>Ghi chú:</strong> Nếu không chọn ai, hệ thống sẽ tự động giao cho <strong>toàn bộ lớp học</strong>.
                  </p>
                </div>
              )}
            </div>

            {/* Chế độ Giao bài (Mode) */}
            <div>
              <label className="block text-sm font-bold text-gray-900 dark:text-slate-100 mb-2">Chế độ giao bài</label>
              <div className="grid grid-cols-2 gap-3">
                <div
                  onClick={() => setMode('practice')}
                  className={`cursor-pointer border-2 rounded-xl p-3 flex flex-col gap-1 transition-all ${mode === 'practice' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20 shadow-sm' : 'border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-indigo-200 dark:hover:border-indigo-800'}`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${mode === 'practice' ? 'border-indigo-600' : 'border-gray-400 dark:border-slate-600'}`}>
                      {mode === 'practice' && <div className="w-2 h-2 bg-indigo-600 dark:bg-indigo-400 rounded-full" />}
                    </div>
                    <span className="font-bold text-gray-900 dark:text-slate-100">Luyện Tập Tự Do</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400 pl-6">Học sinh làm bài thoải mái, không áp lực. Tùy chỉnh bật/tắt từng tính năng bảo mật.</p>
                </div>

                <div
                  onClick={() => setMode('exam')}
                  className={`cursor-pointer border-2 rounded-xl p-3 flex flex-col gap-1 transition-all ${mode === 'exam' ? 'border-red-500 bg-red-50 dark:bg-red-950/20 shadow-sm' : 'border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-red-200 dark:hover:border-red-800'}`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${mode === 'exam' ? 'border-red-600' : 'border-gray-400 dark:border-slate-600'}`}>
                      {mode === 'exam' && <div className="w-2 h-2 bg-red-600 dark:bg-red-400 rounded-full" />}
                    </div>
                    <span className="font-bold text-gray-900 dark:text-slate-100">Thi / Kiểm Tra</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400 pl-6">Bảo vệ nghiêm ngặt: Ép toàn màn hình, chặn đổi tab, chặn copy. Có lưu lịch sử vi phạm.</p>
                </div>
              </div>
            </div>

            {/* Time Config */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-900 dark:text-slate-100 mb-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-indigo-600 dark:text-indigo-400" /> Thời gian Bắt đầu
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="date"
                    className="col-span-2 border border-gray-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100 rounded-lg p-2.5 text-sm outline-none focus:border-indigo-500 w-full [&::-webkit-calendar-picker-indicator]:scale-[1.4] [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:dark:invert"
                    value={startTimeDate}
                    onChange={e => setStartTimeDate(e.target.value)}
                  />
                  <input
                    type="time"
                    className="col-span-1 border border-gray-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100 rounded-lg p-2.5 text-sm outline-none focus:border-indigo-500 w-full [&::-webkit-calendar-picker-indicator]:scale-[1.3] [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:dark:invert"
                    value={startTimeHour}
                    onChange={e => setStartTimeHour(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 dark:text-slate-100 mb-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-indigo-600 dark:text-indigo-400" /> Thời gian Kết thúc
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="date"
                    className="col-span-2 border border-gray-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100 rounded-lg p-2.5 text-sm outline-none focus:border-indigo-500 w-full [&::-webkit-calendar-picker-indicator]:scale-[1.4] [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:dark:invert"
                    value={endTimeDate}
                    onChange={e => setEndTimeDate(e.target.value)}
                  />
                  <input
                    type="time"
                    className="col-span-1 border border-gray-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100 rounded-lg p-2.5 text-sm outline-none focus:border-indigo-500 w-full [&::-webkit-calendar-picker-indicator]:scale-[1.3] [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:dark:invert"
                    value={endTimeHour}
                    onChange={e => setEndTimeHour(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-900 dark:text-slate-100 mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" /> Thời gian (Phút)
                </label>
                <input
                  type="number"
                  className="w-full border border-gray-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100 rounded-lg p-2.5 outline-none focus:border-indigo-500"
                  value={duration}
                  onChange={e => setDuration(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 dark:text-slate-100 mb-2 flex items-center gap-2">
                  <Repeat className="h-4 w-4 text-indigo-600 dark:text-indigo-400" /> Số lần làm bài
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="0 = Không giới hạn"
                  title="Nhập 0 để cho phép làm không giới hạn"
                  className="w-full border border-gray-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100 rounded-lg p-2.5 outline-none focus:border-indigo-500"
                  value={maxAttempts}
                  onChange={e => {
                    const val = Number(e.target.value);
                    if (val >= 0) setMaxAttempts(val);
                  }}
                />
              </div>
            </div>

            {/* Cấu hình xáo trộn đề thi */}
            <div className="border border-gray-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-950">
              <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                <Shuffle className="h-4 w-4 text-indigo-600 dark:text-indigo-400" /> Cấu hình xáo trộn đề thi
              </h3>
              <div className="space-y-4">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={shuffleQuestions} 
                    onChange={e => setShuffleQuestions(e.target.checked)} 
                    className="mt-0.5 w-4 h-4 rounded border-gray-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500" 
                  />
                  <div>
                    <span className="text-sm text-gray-700 dark:text-slate-300 group-hover:text-gray-900 dark:group-hover:text-slate-100 font-bold">Xáo trộn thứ tự câu hỏi</span>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Hiển thị các câu hỏi theo thứ tự ngẫu nhiên cho mỗi học sinh để hạn chế trao đổi bài.</p>
                  </div>
                </label>

                {shuffleQuestions && (
                  <div className="pl-7 pt-2 border-t border-gray-100 dark:border-slate-800 space-y-3">
                    <label className="flex items-start gap-2.5 cursor-pointer group">
                      <input 
                        type="radio" 
                        name="shuffleQuestionsMode"
                        value="by_level"
                        checked={shuffleQuestionsMode === 'by_level'}
                        onChange={() => setShuffleQuestionsMode('by_level')}
                        className="mt-0.5 w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-slate-700"
                      />
                      <div>
                        <span className="text-xs font-bold text-gray-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-450">Trộn theo mức độ tăng dần (Khuyên dùng)</span>
                        <p className="text-[11px] text-gray-500 dark:text-slate-400">Giữ nguyên thứ tự câu hỏi đi từ Dễ đến Khó (Nhận biết → Kết nối → Vận dụng), chỉ trộn các câu hỏi cùng mức độ.</p>
                      </div>
                    </label>

                    <label className="flex items-start gap-2.5 cursor-pointer group">
                      <input 
                        type="radio" 
                        name="shuffleQuestionsMode"
                        value="random"
                        checked={shuffleQuestionsMode === 'random'}
                        onChange={() => setShuffleQuestionsMode('random')}
                        className="mt-0.5 w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-slate-700"
                      />
                      <div>
                        <span className="text-xs font-bold text-gray-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-450">Trộn ngẫu nhiên hoàn toàn</span>
                        <p className="text-[11px] text-gray-500 dark:text-slate-400">Không giữ cấu trúc độ khó, tất cả câu hỏi được xáo trộn ngẫu nhiên hoàn toàn.</p>
                      </div>
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Result Settings */}
            <div className="border border-gray-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-950">
              <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                <Eye className="h-4 w-4 text-indigo-600 dark:text-indigo-400" /> Cấu hình xem kết quả
              </h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" checked={viewScore} onChange={e => setViewScore(e.target.checked)} className="w-4 h-4 rounded border-gray-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500" />
                  <span className="text-sm text-gray-700 dark:text-slate-300 group-hover:text-gray-900 dark:group-hover:text-slate-100">Học sinh được xem điểm số</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" checked={viewPassFail} onChange={e => setViewPassFail(e.target.checked)} className="w-4 h-4 rounded border-gray-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500" />
                  <span className="text-sm text-gray-700 dark:text-slate-300 group-hover:text-gray-900 dark:group-hover:text-slate-100">Hiển thị đúng/sai từng câu</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" checked={viewHint} onChange={e => setViewHint(e.target.checked)} className="w-4 h-4 rounded border-gray-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500" />
                  <span className="text-sm text-gray-700 dark:text-slate-300 group-hover:text-gray-900 dark:group-hover:text-slate-100 flex items-center gap-1">
                    <Lightbulb className="h-3 w-3 text-orange-500" /> Hiển thị gợi ý/hướng dẫn (không đáp án)
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" checked={viewSolution} onChange={e => setViewSolution(e.target.checked)} className="w-4 h-4 rounded border-gray-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500" />
                  <span className="text-sm text-gray-700 dark:text-slate-300 group-hover:text-gray-900 dark:group-hover:text-slate-100">Hiển thị lời giải chi tiết (Đáp án)</span>
                </label>
                <label className={`flex items-center gap-3 cursor-pointer group ${maxAttempts === 0 ? 'opacity-50 grayscale' : ''}`}>
                  <input 
                    type="checkbox" 
                    disabled={maxAttempts === 0}
                    checked={viewSolutionOnLastAttemptOnly} 
                    onChange={e => setViewSolutionOnLastAttemptOnly(e.target.checked)} 
                    className="w-4 h-4 rounded border-gray-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500" 
                  />
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-700 dark:text-slate-300 group-hover:text-gray-900 dark:group-hover:text-slate-100 font-bold text-indigo-600 dark:text-indigo-400">Được xem lời giải chi tiết (đáp án) ở lần làm bài áp chót</span>
                    {maxAttempts === 0 && <p className="text-[10px] text-gray-400 dark:text-slate-500 italic font-normal">* Chỉ áp dụng khi có giới hạn số lần làm bài</p>}
                  </div>
                </label>
              </div>
            </div>

            {/* Cấu hình chấm điểm */}
            <div className="border border-gray-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-950">
              <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-indigo-600 dark:text-indigo-400" /> Cấu hình chấm điểm
              </h3>
              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={caseSensitiveShortAnswer} 
                    onChange={e => setCaseSensitiveShortAnswer(e.target.checked)} 
                    className="mt-0.5 w-4 h-4 rounded border-gray-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500" 
                  />
                  <div>
                    <span className="text-sm text-gray-700 dark:text-slate-300 group-hover:text-gray-900 dark:group-hover:text-slate-100 font-medium">Phân biệt viết hoa / viết thường</span>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Áp dụng cho câu hỏi Tự luận ngắn/Điền khuyết. Yêu cầu học sinh nhập chính xác cả chữ hoa và chữ thường.</p>
                  </div>
                </label>
              </div>
            </div>
            {/* Cấu hình Bảo mật Anti-Cheat */}
            <div className="border border-gray-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-950">
              <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-orange-600 dark:text-orange-400" /> Cấu hình bảo mật & Giám sát
              </h3>

              <div className="space-y-4">
                {/* Khóa mềm nếu là Exam mode */}
                <div className="grid grid-cols-1 gap-3">
                  <label className={`flex items-start gap-3 cursor-pointer group ${mode === 'exam' ? 'opacity-80' : ''}`}>
                    <input type="checkbox" disabled={mode === 'exam'} checked={mode === 'exam' ? true : requireFullscreen} onChange={e => setRequireFullscreen(e.target.checked)} className="mt-0.5 w-4 h-4 rounded border-gray-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500" />
                    <div>
                      <span className="text-sm font-medium text-gray-900 dark:text-slate-100 flex items-center gap-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400"><Expand className="h-4 w-4 text-gray-400 dark:text-slate-500" /> Yêu cầu Toàn màn hình (Fullscreen)</span>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Bắt buộc học sinh phải phóng to màn hình mới được làm bài.</p>
                    </div>
                  </label>

                  <label className={`flex items-start gap-3 cursor-pointer group ${mode === 'exam' ? 'opacity-80' : ''}`}>
                    <input type="checkbox" disabled={mode === 'exam'} checked={mode === 'exam' ? true : preventTabSwitch} onChange={e => setPreventTabSwitch(e.target.checked)} className="mt-0.5 w-4 h-4 rounded border-gray-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500" />
                    <div>
                      <span className="text-sm font-medium text-gray-900 dark:text-slate-100 flex items-center gap-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400"><Laptop className="h-4 w-4 text-gray-400 dark:text-slate-500" /> Chặn chuyển Tab / Cửa sổ khác</span>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Hệ thống sẽ đếm số lần vi phạm nếu học sinh chuyển qua cửa sổ khác để tra tài liệu.</p>
                    </div>
                  </label>

                  <label className={`flex items-start gap-3 cursor-pointer group ${mode === 'exam' ? 'opacity-80' : ''}`}>
                    <input type="checkbox" disabled={mode === 'exam'} checked={mode === 'exam' ? true : preventCopy} onChange={e => setPreventCopy(e.target.checked)} className="mt-0.5 w-4 h-4 rounded border-gray-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500" />
                    <div>
                      <span className="text-sm font-medium text-gray-900 dark:text-slate-100 flex items-center gap-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400"><CopyX className="h-4 w-4 text-gray-400 dark:text-slate-500" /> Chặn Copy & Chuột phải</span>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Không cho phép bôi đen, sao chép nội dung câu hỏi.</p>
                    </div>
                  </label>
                </div>

                {/* Advanced AI Camera */}
                <div className="pt-3 border-t border-gray-100 dark:border-slate-800">
                  <label className="flex items-start gap-3 cursor-pointer group bg-indigo-50/50 dark:bg-indigo-950/20 p-3 rounded-lg border border-indigo-100 dark:border-indigo-900/40 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors">
                    <input type="checkbox" checked={requireCamera} onChange={e => setRequireCamera(e.target.checked)} className="mt-1 w-4 h-4 rounded border-gray-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500" />
                    <div>
                      <span className="text-sm font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1 group-hover:text-indigo-700 dark:group-hover:text-indigo-200">
                        <Monitor className="h-4 w-4 text-indigo-500 dark:text-indigo-450" /> Bật Giám sát Camera (AI on Edge) <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 px-1.5 py-0.5 rounded ml-2 uppercase font-black tracking-wider">Mới</span>
                      </span>
                      <p className="text-xs text-indigo-700/80 dark:text-indigo-350/80 mt-1">Sử dụng Camera của học sinh để chạy thuật toán nhận diện khuôn mặt trực tiếp ngay trên trình duyệt mà không cần gửi video về Server. Cảnh báo nếu học sinh vắng mặt hoặc nhờ người thi hộ.</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="p-5 border-t dark:border-slate-800 bg-white dark:bg-slate-900 rounded-b-xl flex justify-end gap-3">
          {successLink ? (
            <button onClick={onClose} className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-md transition-all">
              Đóng
            </button>
          ) : (
            <>
              <button onClick={onClose} className="px-5 py-2.5 text-gray-700 dark:text-slate-300 font-medium hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Hủy bỏ</button>
              <button onClick={handleAssign} className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-md transition-all hover:shadow-lg">
                Giao bài ngay
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
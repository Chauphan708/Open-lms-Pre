import React, { useMemo, useState } from 'react';
import { Settings, BrainCircuit, Users, ChevronDown } from 'lucide-react';
import { useStore } from '../../store';
import { ExamDifficulty } from '../../types';

export interface ExamGeneralConfigProps {
  title: string; setTitle: (v: string) => void;
  subject: string; setSubject: (v: string) => void;
  grade: string; setGrade: (v: string) => void;
  topic: string; setTopic: (v: string) => void;
  difficulty: ExamDifficulty; setDifficulty: (v: ExamDifficulty) => void;
  examCategory: 'EXAM' | 'TASK'; setExamCategory: (v: 'EXAM' | 'TASK') => void;
  duration: number; setDuration: (v: number) => void;
  saveTarget: 'BANK' | 'CLASS'; setSaveTarget: (v: 'BANK' | 'CLASS') => void;
  targetClassId: string; setTargetClassId: (v: string) => void;
  saveToBank: boolean; setSaveToBank: (v: boolean) => void;
}

export const ExamGeneralConfig: React.FC<ExamGeneralConfigProps> = ({
  title, setTitle, subject, setSubject, grade, setGrade, topic, setTopic,
  difficulty, setDifficulty, examCategory, setExamCategory, duration, setDuration,
  saveTarget, setSaveTarget, targetClassId, setTargetClassId, saveToBank, setSaveToBank
}) => {
  const { exams, classes, user } = useStore();
  const [isTopicDropdownOpen, setIsTopicDropdownOpen] = useState(false);

  const teacherClasses = classes.filter(c => c.teacherId === user?.id);

  const availableTopics = useMemo(() => {
    const topics = new Set<string>();
    exams.forEach(exam => {
      if (!exam.deletedAt && exam.subject === subject && exam.topic && exam.topic.trim() !== '') {
        topics.add(exam.topic.trim());
      }
    });
    return Array.from(topics).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [exams, subject]);

  const filteredTopics = useMemo(() => {
    if (!topic) return availableTopics;
    const lowerSearch = topic.toLowerCase();
    return availableTopics.filter(t => t.toLowerCase().includes(lowerSearch));
  }, [topic, availableTopics]);

  const SUBJECTS = ['Toán', 'Tiếng Việt', 'Khoa học', 'Lịch sử và Địa lí', 'Công nghệ', 'Tiếng Anh', 'Tin học'];
  const GRADES = ['1', '2', '3', '4', '5'];

  return (
    <div className="bg-white p-5 rounded-xl border shadow-sm space-y-4">
      <h3 className="font-bold text-gray-800 flex items-center gap-2">
        <Settings className="h-4 w-4" /> Cấu hình chung
      </h3>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tên bài tập</label>
          <input
            type="text" value={title} onChange={e => setTitle(e.target.value)}
            placeholder="VD: Bài tập Toán Giữa Kì 1..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Môn học</label>
            <select
              value={subject} onChange={e => setSubject(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Khối lớp</label>
            <select
              value={grade} onChange={e => setGrade(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              {GRADES.map(g => <option key={g} value={g}>Lớp {g}</option>)}
            </select>
          </div>
        </div>
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">Chủ đề / Nội dung kiến thức (Tùy chọn)</label>
          <div className="relative">
            <input
              type="text"
              value={topic}
              onChange={e => {
                setTopic(e.target.value);
                setIsTopicDropdownOpen(true);
              }}
              onFocus={() => setIsTopicDropdownOpen(true)}
              onBlur={() => {
                setTimeout(() => setIsTopicDropdownOpen(false), 200);
              }}
              placeholder="VD: Phân số, Hình học..."
              className="w-full border border-gray-300 rounded-lg pl-3 pr-10 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
          </div>

          {isTopicDropdownOpen && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {filteredTopics.length > 0 ? (
                <ul className="py-1">
                  {filteredTopics.map((t, idx) => (
                    <li
                      key={idx}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setTopic(t);
                        setIsTopicDropdownOpen(false);
                      }}
                      className="px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer"
                    >
                      {t}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-4 py-3 text-sm text-gray-500 italic">
                  {topic ? 'Nhấn "Lưu & Xuất Bản" để lưu chủ đề mới này.' : 'Chưa có chủ đề nào được lưu trước đó.'}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Loại bộ đề</label>
              <select
                value={examCategory} onChange={e => setExamCategory(e.target.value as any)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
              >
                <option value="EXAM">ĐỀ KT</option>
                <option value="TASK">NHIỆM VỤ</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Thời gian (phút)</label>
              <input
                type="number" value={duration} onChange={e => setDuration(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>
        </div>

        <div className="pt-2 border-t mt-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">Lưu trữ</label>
          <div className="grid grid-cols-2 gap-3">
            <label className={`cursor-pointer border p-3 rounded-lg flex flex-col items-center gap-2 text-sm transition-colors ${saveTarget === 'BANK' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'hover:bg-gray-50 bg-white'}`}>
              <input type="radio" name="target" className="hidden" checked={saveTarget === 'BANK'} onChange={() => setSaveTarget('BANK')} />
              <BrainCircuit className="h-5 w-5" />
              Kho Đề KT & Nhiệm vụ
            </label>
            <label className={`cursor-pointer border p-3 rounded-lg flex flex-col items-center gap-2 text-sm transition-colors ${saveTarget === 'CLASS' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'hover:bg-gray-50 bg-white'}`}>
              <input type="radio" name="target" className="hidden" checked={saveTarget === 'CLASS'} onChange={() => setSaveTarget('CLASS')} />
              <Users className="h-5 w-5" />
              Giao cho lớp
            </label>
          </div>
          {saveTarget === 'CLASS' && (
            <div className="mt-3 animate-fade-in">
              <select
                value={targetClassId}
                onChange={e => setTargetClassId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900"
              >
                <option value="">-- Chọn lớp --</option>
                {teacherClasses.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="pt-2 border-t mt-2">
          <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
            <input type="checkbox" checked={saveToBank} onChange={e => setSaveToBank(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500" />
            <span className="text-sm text-gray-700">Đồng thời lưu các câu hỏi vào <strong>Ngân hàng câu hỏi</strong></span>
          </label>
        </div>
      </div>
    </div>
  );
};

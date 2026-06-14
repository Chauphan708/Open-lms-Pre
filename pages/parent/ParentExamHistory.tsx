import React, { useEffect, useState } from 'react';
import { ParentLayout } from '../../components/ParentLayout';
import { useParentStore } from '../../services/parentStore';
import { supabase } from '../../services/supabaseClient';
import { Attempt, Exam } from '../../types';
import { Loader2, ClipboardList, ChevronRight, Calendar, Info } from 'lucide-react';

export const ParentExamHistory = () => {
  const { linkedStudents, currentParent } = useParentStore();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [exams, setExams] = useState<Record<string, Exam>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (linkedStudents.length > 0) {
      fetchResults();
    } else {
      setIsLoading(false);
    }
  }, [linkedStudents]);

  const fetchResults = async () => {
    setIsLoading(true);
    try {
      const studentIds = linkedStudents.map(s => s.id);
      
      // 1. Lấy tất cả bài làm của các con
      const { data: attemptData } = await supabase
        .from('attempts')
        .select('*')
        .in('student_id', studentIds)
        .order('submitted_at', { ascending: false });

      if (attemptData) {
        const mappedAttempts: Attempt[] = attemptData.map((a: any) => ({
          id: String(a.id),
          answers: (a.answers as Record<string, any>) || {},
          examId: String(a.exam_id || a.examId),
          assignmentId: String(a.assignment_id || a.assignmentId),
          studentId: String(a.student_id || a.studentId),
          submittedAt: a.submitted_at || a.submittedAt,
          score: a.score,
          teacherFeedback: a.teacher_feedback,
          totalTimeSpentSec: a.total_time_spent_sec
        }));

        setAttempts(mappedAttempts);

        // 2. Lấy thông tin bài thi để hiện tiêu đề
        const examIds = Array.from(new Set(mappedAttempts.map(a => a.examId)));
        if (examIds.length > 0) {
          const { data: examData } = await supabase
            .from('exams')
            .select('*')
            .in('id', examIds);
          
          if (examData) {
            const examMap: Record<string, Exam> = {};
            examData.forEach((e: any) => {
              examMap[String(e.id)] = e as Exam;
            });
            setExams(examMap);
          }
        }
      }
    } catch (e) {
      console.error('Lỗi khi lấy kết quả học tập:', e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ParentLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3">
             <ClipboardList className="w-8 h-8 text-emerald-600" />
             Lịch sử học tập
          </h2>
          <button 
            onClick={fetchResults}
            className="text-emerald-600 font-bold text-sm hover:underline"
          >
            Làm mới
          </button>
        </div>

        {isLoading ? (
          <div className="bg-white p-12 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
            <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
            <p className="text-gray-500 font-medium">Đang tải kết quả bài làm...</p>
          </div>
        ) : attempts.length > 0 ? (
          <div className="space-y-4">
            {attempts.map(att => {
              const exam = exams[att.examId];
              const student = linkedStudents.find(s => s.id === att.studentId);
              
              return (
                <div key={att.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group cursor-default">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                           {student?.name || 'Học sinh'}
                        </span>
                        <span className="text-gray-400 text-xs flex items-center gap-1">
                           <Calendar className="w-3 h-3" />
                           {new Date(att.submittedAt).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 group-hover:text-emerald-600 transition-colors">
                        {exam?.title || 'Bài thi không tên'}
                      </h3>
                      <div className="mt-3 flex flex-wrap gap-4">
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                           <span className="font-bold text-gray-700">Thời gian:</span> {Math.floor((att.totalTimeSpentSec || 0) / 60)} phút
                        </div>
                        {att.teacherFeedback && (
                          <div className="flex items-center gap-1 text-sm text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100">
                             <Info className="w-3 h-3" /> GV đã nhận xét
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                       <div className="text-3xl font-black text-emerald-600 leading-none mb-1">
                         {att.score?.toFixed(1) || '0.0'}
                       </div>
                       <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                         ĐIỂM SỐ
                       </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white p-16 rounded-3xl shadow-sm border border-gray-100 text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
               <ClipboardList className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-800">Chưa có kết quả nào</h3>
            <p className="text-gray-500 mt-2">Khi các con hoàn thành bài tập, kết quả sẽ hiện tại đây.</p>
          </div>
        )}
      </div>
    </ParentLayout>
  );
};

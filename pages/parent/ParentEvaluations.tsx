import React, { useState, useEffect } from 'react';
import { ParentLayout } from '../../components/ParentLayout';
import { useParentStore } from '../../services/parentStore';
import { supabase } from '../../services/supabaseClient';
import { FileText, Calendar, BookOpen, Lightbulb, Heart, MessageSquare, ChevronRight, User } from 'lucide-react';
import { SUBJECT_LIST, COMPETENCY_LIST, QUALITY_LIST } from '../../services/evaluationStore';

export const ParentEvaluations = () => {
  const { linkedStudents } = useParentStore();
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'LOG' | 'SUMMARY'>('LOG');

  useEffect(() => {
    if (linkedStudents.length > 0 && !selectedStudentId) {
      setSelectedStudentId(linkedStudents[0].id);
    }
  }, [linkedStudents, selectedStudentId]);

  useEffect(() => {
    if (selectedStudentId) {
      fetchEvaluations(selectedStudentId);
    }
  }, [selectedStudentId]);

  const fetchEvaluations = async (studentId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('daily_evaluations')
        .select('*')
        .eq('student_id', studentId)
        .order('evaluation_date', { ascending: false });

      if (error) throw error;
      setEvaluations(data || []);
    } catch (err) {
      console.error('Lỗi khi tải nhận xét:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getRatingLabel = (rating: string) => {
    const labels: Record<string, string> = {
      'T': 'Tốt',
      'H': 'Hoàn thành tốt',
      'Đ': 'Đạt',
      'C': 'Chưa hoàn thành',
      'None': 'Chưa đánh giá'
    };
    return labels[rating] || rating;
  };

  const getRatingColor = (rating: string) => {
    const colors: Record<string, string> = {
      'T': 'bg-green-100 text-green-700',
      'H': 'bg-blue-100 text-blue-700',
      'Đ': 'bg-amber-100 text-amber-700',
      'C': 'bg-red-100 text-red-700',
      'None': 'bg-gray-100 text-gray-400'
    };
    return colors[rating] || 'bg-gray-100 text-gray-500';
  };

  const activeStudent = linkedStudents.find(s => s.id === selectedStudentId);

  return (
    <ParentLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Nhận xét của Giáo viên</h1>
            <p className="text-gray-500 text-sm">Theo dõi đánh giá định kỳ theo Thông tư 27</p>
          </div>

          {linkedStudents.length > 1 && (
            <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-200">
              {linkedStudents.map(student => (
                <button
                  key={student.id}
                  onClick={() => setSelectedStudentId(student.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    selectedStudentId === student.id
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-transparent text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {student.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedStudentId ? (
          <div className="space-y-6">
            {evaluations.length > 0 ? (
              evaluations.map((evalItem) => (
                <div key={evalItem.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                  {/* Date Header */}
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-emerald-600">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-gray-700">Ngày {new Date(evalItem.evaluation_date).toLocaleDateString('vi-VN')}</span>
                    </div>
                  </div>

                  <div className="p-6 space-y-8">
                    {/* General Comment */}
                    {evalItem.general_comment && (
                      <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100">
                        <h4 className="text-sm font-bold text-emerald-800 flex items-center gap-2 mb-2">
                          <MessageSquare className="w-4 h-4" /> Nhận xét chung của giáo viên
                        </h4>
                        <p className="text-gray-700 italic leading-relaxed">"{evalItem.general_comment}"</p>
                      </div>
                    )}

                    {/* Three Columns View */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Subjects */}
                      <div className="space-y-4">
                        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                          <BookOpen className="w-4 h-4" /> Môn học & Hoạt động
                        </h4>
                        <div className="space-y-3">
                          {SUBJECT_LIST.map(sub => {
                            const data = evalItem.subjects?.[sub.key];
                            if (!data || data.rating === 'None') return null;
                            return (
                              <div key={sub.key} className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                <div className="flex justify-between items-start mb-2">
                                  <span className="font-bold text-gray-800 text-sm">{sub.label}</span>
                                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${getRatingColor(data.rating)}`}>
                                    {data.rating}
                                  </span>
                                </div>
                                {data.comment && <p className="text-xs text-gray-500 italic mt-1 leading-relaxed">{data.comment}</p>}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Competencies */}
                      <div className="space-y-4">
                        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                          <Lightbulb className="w-4 h-4" /> Năng lực
                        </h4>
                        <div className="space-y-3">
                          {COMPETENCY_LIST.map(comp => {
                            const data = evalItem.competencies?.[comp.key];
                            if (!data || data.rating === 'None') return null;
                            return (
                              <div key={comp.key} className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                <div className="flex justify-between items-start mb-2">
                                  <span className="font-bold text-gray-800 text-sm">{comp.label}</span>
                                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${getRatingColor(data.rating)}`}>
                                    {data.rating}
                                  </span>
                                </div>
                                {data.comment && <p className="text-xs text-gray-500 italic mt-1 leading-relaxed">{data.comment}</p>}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Qualities */}
                      <div className="space-y-4">
                        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                          <Heart className="w-4 h-4" /> Phẩm chất
                        </h4>
                        <div className="space-y-3">
                          {QUALITY_LIST.map(q => {
                            const data = evalItem.qualities?.[q.key];
                            if (!data || data.rating === 'None') return null;
                            return (
                              <div key={q.key} className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                <div className="flex justify-between items-start mb-2">
                                  <span className="font-bold text-gray-800 text-sm">{q.label}</span>
                                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${getRatingColor(data.rating)}`}>
                                    {data.rating}
                                  </span>
                                </div>
                                {data.comment && <p className="text-xs text-gray-500 italic mt-1 leading-relaxed">{data.comment}</p>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white p-20 rounded-3xl text-center border border-gray-100 shadow-sm">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-10 h-10 text-gray-200" />
                </div>
                <h4 className="text-lg font-bold text-gray-900">Chưa có nhận xét nào</h4>
                <p className="text-gray-500">Giáo viên chưa cập nhật nhận xét định kỳ cho học sinh này.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white p-12 rounded-3xl text-center border border-gray-100 shadow-sm">
             <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
               <User className="w-10 h-10 text-gray-400" />
             </div>
             <h3 className="text-xl font-bold text-gray-900">Vui lòng chọn hồ sơ con</h3>
          </div>
        )}
      </div>
    </ParentLayout>
  );
};

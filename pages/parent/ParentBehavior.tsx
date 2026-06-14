import React, { useState, useEffect } from 'react';
import { ParentLayout } from '../../components/ParentLayout';
import { useParentStore } from '../../services/parentStore';
import { supabase } from '../../services/supabaseClient';
import { Activity, TrendingUp, TrendingDown, Clock, Filter, User } from 'lucide-react';

export const ParentBehavior = () => {
  const { linkedStudents } = useParentStore();
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'POSITIVE' | 'NEGATIVE'>('ALL');

  useEffect(() => {
    if (linkedStudents.length > 0 && !selectedStudentId) {
      setSelectedStudentId(linkedStudents[0].id);
    }
  }, [linkedStudents, selectedStudentId]);

  useEffect(() => {
    if (selectedStudentId) {
      fetchLogs(selectedStudentId);
    }
  }, [selectedStudentId]);

  const fetchLogs = async (studentId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('behavior_logs')
        .select('*, behaviors(description, type, points)')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error('Lỗi khi tải nhật ký hành vi:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (filter === 'ALL') return true;
    const isPositive = log.points > 0;
    return filter === 'POSITIVE' ? isPositive : !isPositive;
  });

  const stats = {
    total: logs.reduce((sum, l) => sum + (l.points || 0), 0),
    positive: logs.filter(l => l.points > 0).length,
    negative: logs.filter(l => l.points < 0).length,
  };

  const activeStudent = linkedStudents.find(s => s.id === selectedStudentId);

  return (
    <ParentLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Nhật ký Hành vi</h1>
            <p className="text-gray-500 text-sm">Theo dõi quá trình rèn luyện tại lớp</p>
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
          <>
            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 rounded-3xl text-white shadow-lg shadow-emerald-100">
                <div className="flex items-center gap-3 opacity-80 mb-2">
                  <Activity className="w-5 h-5" />
                  <span className="text-sm font-medium">Tổng điểm tích lũy</span>
                </div>
                <p className="text-3xl font-black">{stats.total} XP</p>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3 text-emerald-600 mb-2">
                  <TrendingUp className="w-5 h-5" />
                  <span className="text-sm font-bold">Khen ngợi</span>
                </div>
                <p className="text-3xl font-black text-gray-900">{stats.positive} <span className="text-sm font-medium text-gray-400">lần</span></p>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3 text-red-500 mb-2">
                  <TrendingDown className="w-5 h-5" />
                  <span className="text-sm font-bold">Nhắc nhở</span>
                </div>
                <p className="text-3xl font-black text-gray-900">{stats.negative} <span className="text-sm font-medium text-gray-400">lần</span></p>
              </div>
            </div>

            {/* Filter & List */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-50 flex items-center justify-between flex-wrap gap-4">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-gray-400" /> Chi tiết hoạt động
                </h3>
                
                <div className="flex p-1 bg-gray-50 rounded-xl">
                  {[
                    { key: 'ALL', label: 'Tất cả' },
                    { key: 'POSITIVE', label: 'Tích cực' },
                    { key: 'NEGATIVE', label: 'Nhắc nhở' },
                  ].map((btn) => (
                    <button
                      key={btn.key}
                      onClick={() => setFilter(btn.key as any)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        filter === btn.key
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="divide-y divide-gray-50">
                {isLoading ? (
                  <div className="p-12 text-center text-gray-400">Đang tải nhật ký...</div>
                ) : filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => (
                    <div key={log.id} className="p-6 flex items-start justify-between group hover:bg-gray-50/50 transition-colors">
                      <div className="flex gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                          log.points > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                        }`}>
                          {log.points > 0 ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-lg">
                            {log.reason || log.behaviors?.description || 'Ghi nhận hành vi'}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                            <span className="font-medium">{new Date(log.created_at).toLocaleDateString('vi-VN')}</span>
                            <span>•</span>
                            <span>{new Date(log.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      </div>
                      <div className={`text-xl font-black ${
                        log.points > 0 ? 'text-emerald-600' : 'text-red-500'
                      }`}>
                        {log.points > 0 ? `+${log.points}` : log.points}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-20 text-center">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Filter className="w-10 h-10 text-gray-200" />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900">Không tìm thấy nhật ký</h4>
                    <p className="text-gray-500">Học sinh chưa có hoạt động nào trong mục này.</p>
                  </div>
                )}
              </div>
            </div>
          </>
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

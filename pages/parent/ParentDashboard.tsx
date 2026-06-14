import React, { useState, useEffect } from 'react';
import { ParentLayout } from '../../components/ParentLayout';
import { useParentStore } from '../../services/parentStore';
import { User, Users, Activity, FileText, CheckCircle, AlertTriangle, Medal, Layers, Plus, X, Link as LinkIcon, UserPlus } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';

export const ParentDashboard = () => {
  const { currentParent, linkedStudents, linkStudent, isParentLoading } = useParentStore();
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  
  // Link Child Form States
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkInput, setLinkInput] = useState('');
  const [linkSuccess, setLinkSuccess] = useState('');
  const [linkError, setLinkError] = useState('');

  const [stats, setStats] = useState({
    attemptsCount: 0,
    tt27Comment: '',
    behaviorPoints: 0,
    weeklyBehaviorPoints: 0,
    arenaRank: '--',
    isLoading: false
  });
  const [recentBehaviors, setRecentBehaviors] = useState<any[]>([]);
  const [recentExams, setRecentExams] = useState<any[]>([]);

  useEffect(() => {
    if (linkedStudents.length > 0 && !selectedStudentId) {
      setSelectedStudentId(linkedStudents[0].id);
    }
  }, [linkedStudents, selectedStudentId]);

  useEffect(() => {
    if (selectedStudentId) {
      fetchStudentStats(selectedStudentId);
    }
  }, [selectedStudentId]);

  const fetchStudentStats = async (studentId: string) => {
    setStats(prev => ({ ...prev, isLoading: true }));
    try {
      // 1. Số bài nộp
      const { count: attemptsCount } = await supabase
        .from('attempts')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', studentId);

      // 2. Nhận xét TT27 mới nhất
      const { data: evalData } = await supabase
        .from('daily_evaluations')
        .select('general_comment')
        .eq('student_id', studentId)
        .order('evaluation_date', { ascending: false })
        .limit(1);

      // 3. XP tích lũy từ profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('xp, level')
        .eq('id', studentId)
        .single();

      // 4. Nhật ký hành vi gần đây
      const { data: behaviorData } = await supabase
        .from('behavior_logs')
        .select('*, behaviors(description, type, points)')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(5);

      // 5. Tính điểm hành vi tuần này (7 ngày gần nhất)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { data: weeklyBehavior } = await supabase
        .from('behavior_logs')
        .select('points')
        .eq('student_id', studentId)
        .gte('created_at', sevenDaysAgo.toISOString());
      
      const weeklyPoints = (weeklyBehavior || []).reduce((sum, log) => sum + (log.points || 0), 0);

      // 6. Bài làm gần đây
      const { data: recentAttempts } = await supabase
        .from('attempts')
        .select('*, exams(title, subject)')
        .eq('student_id', studentId)
        .order('submitted_at', { ascending: false })
        .limit(3);

      setRecentBehaviors(behaviorData || []);
      setRecentExams(recentAttempts || []);
      setStats({
        attemptsCount: attemptsCount || 0,
        tt27Comment: evalData?.[0]?.general_comment || 'Chưa có nhận xét gần đây',
        behaviorPoints: profile?.xp || 0,
        weeklyBehaviorPoints: weeklyPoints,
        arenaRank: profile?.level ? `Cấp ${profile.level}` : '--',
        isLoading: false
      });
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu dashboard:', err);
      setStats(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleLinkStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkInput.trim()) return;

    setLinkSuccess('');
    setLinkError('');
    
    const result = await linkStudent(linkInput.trim());
    if (result.success) {
      setLinkSuccess(result.message);
      setLinkInput('');
      setTimeout(() => {
        setShowLinkModal(false);
        setLinkSuccess('');
      }, 2000);
    } else {
      setLinkError(result.message);
    }
  };

  const activeStudent = linkedStudents.find(s => s.id === selectedStudentId) || linkedStudents[0];

  return (
    <ParentLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header & Multi-child selector */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tổng quan học tập</h1>
            <p className="text-gray-500">Xem tiến độ và thông báo mới nhất</p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {linkedStudents.length > 1 && (
              <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-200">
                <span className="text-sm font-medium text-gray-500 px-2">Chọn hồ sơ con:</span>
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

            {linkedStudents.length > 0 && (
              <button
                onClick={() => setShowLinkModal(true)}
                className="px-4 py-2.5 bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 text-emerald-700 rounded-xl text-sm font-bold border border-emerald-200 shadow-sm flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Liên kết thêm con
              </button>
            )}
          </div>
        </div>

        {activeStudent ? (
          <>
            {/* Student Info Card */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl p-8 text-white flex flex-col md:flex-row items-center gap-8 shadow-lg relative overflow-hidden">
              <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
                <Users className="w-64 h-64" />
              </div>
              <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border-2 border-white/30 shrink-0">
                <User className="w-12 h-12 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-extrabold mb-1">{activeStudent.name}</h2>
                <div className="flex flex-wrap gap-4 text-emerald-100">
                  <span className="bg-black/20 px-3 py-1 rounded-full text-sm font-medium">
                    Mã HS: {activeStudent.id.substring(0,8).toUpperCase()}
                  </span>
                  <span className="bg-black/20 px-3 py-1 rounded-full text-sm font-medium">
                    Lớp: {activeStudent.className || 'Chưa cập nhật'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 animate-fade-in">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-500 font-medium">Nhận xét TT27</p>
                    <p className="text-sm font-bold text-gray-900 truncate" title={stats.tt27Comment}>
                      {stats.isLoading ? '...' : stats.tt27Comment}
                    </p>
                  </div>
               </div>
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 animate-fade-in">
                  <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center shrink-0">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Bài đã nộp</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.isLoading ? '--' : stats.attemptsCount}
                    </p>
                  </div>
               </div>
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 animate-fade-in">
                  <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">XP tích lũy</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.isLoading ? '--' : stats.behaviorPoints}
                    </p>
                  </div>
               </div>
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 animate-fade-in">
                  <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center shrink-0">
                    <Medal className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Danh hiệu</p>
                    <p className="text-xl font-bold text-gray-900">
                      {stats.isLoading ? '--' : stats.arenaRank}
                    </p>
                  </div>
               </div>
            </div>

            {/* Content Placeholders */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                 <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                   <Activity className="text-emerald-500 w-5 h-5" /> Nhật ký hành vi mới nhất
                 </h3>
                 <div className="flex-1 space-y-3">
                   {stats.isLoading ? (
                     <div className="animate-pulse space-y-2">
                       {[1,2,3].map(i => <div key={i} className="h-12 bg-gray-100 rounded-xl" />)}
                     </div>
                   ) : recentBehaviors.length > 0 ? (
                     recentBehaviors.map((log) => (
                       <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                         <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                              log.points >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {log.points >= 0 ? `+${log.points}` : log.points}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-800">{log.reason || log.behaviors?.description || 'Ghi nhận hành vi'}</p>
                              <p className="text-[10px] text-gray-400">{new Date(log.created_at).toLocaleDateString('vi-VN')}</p>
                            </div>
                         </div>
                       </div>
                     ))
                   ) : (
                     <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                       <Layers className="w-12 h-12 mb-3 opacity-20" />
                       <p className="text-sm">Chưa có nhật ký hành vi</p>
                     </div>
                   )}
                 </div>
                 {recentBehaviors.length > 0 && (
                   <button 
                    onClick={() => window.location.href = '/parent/behavior'}
                    className="mt-4 text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-colors py-2 border-t border-gray-100 w-full"
                   >
                     Xem tất cả nhật ký
                   </button>
                 )}
               </div>

               <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                 <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                   <FileText className="text-blue-500 w-5 h-5" /> Bài làm gần đây
                 </h3>
                 <div className="flex-1 space-y-3">
                   {stats.isLoading ? (
                     <div className="animate-pulse space-y-2">
                       {[1,2,3].map(i => <div key={i} className="h-12 bg-gray-100 rounded-xl" />)}
                     </div>
                   ) : recentExams.length > 0 ? (
                     recentExams.map((attempt) => (
                       <div key={attempt.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                         <div className="min-w-0 mr-2">
                            <p className="text-sm font-bold text-gray-800 truncate">{attempt.exams?.title}</p>
                            <p className="text-[10px] text-gray-400">{attempt.exams?.subject} • {new Date(attempt.submitted_at).toLocaleDateString('vi-VN')}</p>
                         </div>
                         <div className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm font-bold shadow-sm">
                           {attempt.score !== null ? attempt.score : '--'}đ
                         </div>
                       </div>
                     ))
                   ) : (
                     <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                       <Layers className="w-12 h-12 mb-3 opacity-20" />
                       <p className="text-sm">Chưa có bài làm nào</p>
                     </div>
                   )}
                 </div>
                 {recentExams.length > 0 && (
                   <button 
                    onClick={() => window.location.href = '/parent/exams'}
                    className="mt-4 text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors py-2 border-t border-gray-100 w-full"
                   >
                     Xem lịch sử học tập
                   </button>
                 )}
               </div>
            </div>
          </>
        ) : (
          <div className="bg-white p-10 rounded-3xl shadow-lg border border-gray-100 max-w-lg mx-auto text-center animate-in zoom-in-95 duration-200">
             <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-100 shadow-inner">
               <UserPlus className="w-10 h-10 animate-bounce" />
             </div>
             <h3 className="text-xl font-bold text-gray-900 mb-2">Liên kết tài khoản của con</h3>
             <p className="text-gray-500 mb-6 text-sm">
               Bạn vừa tạo tài khoản phụ huynh thành công! Hãy liên kết với con của bạn để bắt đầu theo dõi tiến trình và lịch sử điểm số của bé ngay lập tức.
             </p>
             
             {linkError && (
               <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm font-semibold border border-red-100 text-center mb-4">
                 {linkError}
               </div>
             )}

             {linkSuccess && (
               <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl text-sm font-semibold border border-emerald-100 text-center mb-4">
                 {linkSuccess}
               </div>
             )}

             <form onSubmit={handleLinkStudentSubmit} className="space-y-3">
               <div className="relative">
                 <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                 <input
                   type="text"
                   placeholder="Nhập Email hoặc Username học sinh (con)"
                   value={linkInput}
                   onChange={e => setLinkInput(e.target.value)}
                   className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm font-medium transition-all"
                   required
                 />
               </div>
               <button
                 type="submit"
                 disabled={isParentLoading || !linkInput.trim()}
                 className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3 rounded-xl font-bold text-sm hover:from-emerald-700 hover:to-teal-700 active:scale-[0.98] transition-all disabled:opacity-50 shadow-md shadow-emerald-200"
               >
                 {isParentLoading ? 'Đang liên kết...' : 'Liên kết học sinh ngay'}
               </button>
             </form>
          </div>
        )}

      </div>

      {/* Link Child Dialog (Modal) */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                  <UserPlus className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-lg text-gray-900">Liên kết học sinh mới</h3>
              </div>
              <button 
                onClick={() => { setShowLinkModal(false); setLinkError(''); setLinkSuccess(''); setLinkInput(''); }} 
                className="text-gray-400 hover:text-gray-600 bg-white p-1 rounded-full border shadow-sm hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleLinkStudentSubmit} className="p-6 space-y-4">
              <p className="text-xs text-gray-500 leading-relaxed">
                Nhập tên tài khoản (Username) hoặc Email chính xác của bé do nhà trường cấp (ví dụ: <code className="bg-gray-100 px-1 py-0.5 rounded font-mono">an5a1</code> hoặc <code className="bg-gray-100 px-1 py-0.5 rounded font-mono">an5a1@openlms.edu</code>). Hệ thống sẽ tự động ghép nối và đồng bộ ngay.
              </p>

              {linkError && (
                <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm font-semibold border border-red-100 text-center animate-shake">
                  {linkError}
                </div>
              )}

              {linkSuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl text-sm font-semibold border border-emerald-100 text-center">
                  {linkSuccess}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Tài khoản/Email của con</label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="VD: name_student hoặc email_con@openlms.edu"
                    value={linkInput}
                    onChange={e => setLinkInput(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => { setShowLinkModal(false); setLinkError(''); setLinkSuccess(''); setLinkInput(''); }}
                  className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-bold transition-colors text-sm"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isParentLoading || !linkInput.trim()}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-200 transition-all text-sm"
                >
                  {isParentLoading ? 'Đang xử lý...' : 'Xác nhận liên kết'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ParentLayout>
  );
};

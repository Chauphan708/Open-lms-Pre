import React, { useMemo, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { StatCard } from './StatCard';
import {
  BookOpen, Users, TrendingUp, Bell, CheckCircle,
  X, List, Download, BarChart3, Clock, LayoutGrid, Search
} from 'lucide-react';

export const TeacherDashboard: React.FC = () => {
  const { 
    exams, 
    user, 
    attempts, 
    totalAttemptsCount, 
    users, 
    classes, 
    resources, 
    academicYears,
    fetchExams,
    fetchClasses,
    fetchAttempts,
    fetchResources
  } = useStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [timeFilter, setTimeFilter] = useState<'DAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'ALL'>('ALL');
  const [selectedYearId, setSelectedYearId] = useState<string>('ALL');
  
  // Fetch dashboard data on mount
  useEffect(() => {
    if (user) {
      fetchExams();
      fetchClasses();
      fetchAttempts();
      fetchResources();
    }
  }, [user]);
  
  // Student Portfolio Selection
  const [isStudentListModalOpen, setIsStudentListModalOpen] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const myClasses = useMemo(() => classes.filter(c => c.teacherId === user?.id), [classes, user]);
  const [selectedClassId, setSelectedClassId] = useState<string>(myClasses[0]?.id || 'ALL');

  // Handle auto-open or state from portfolio back button
  useEffect(() => {
    if (location.state?.openPortfolioModal) {
      setIsStudentListModalOpen(true);
      // Clear state to prevent reopening on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const classStudents = useMemo(() => {
    if (selectedClassId === 'ALL') {
      const allStudentIds = myClasses.flatMap(c => c.studentIds);
      return users.filter(u => allStudentIds.includes(u.id));
    }
    const selectedClass = myClasses.find(c => c.id === selectedClassId);
    if (!selectedClass) return [];
    return users.filter(u => selectedClass.studentIds.includes(u.id));
  }, [selectedClassId, myClasses, users]);

  const filteredStudents = useMemo(() => {
    return classStudents.filter(s => 
      s.name.toLowerCase().includes(studentSearchQuery.toLowerCase())
    );
  }, [classStudents, studentSearchQuery]);

  const getYearRange = (yearId: string) => {
    if (yearId === 'ALL') return null;
    const year = academicYears.find(y => y.id === yearId);
    if (!year || !year.semesters || year.semesters.length === 0) return null;

    const startDates = year.semesters.map(s => new Date(s.startDate).getTime());
    const endDates = year.semesters.map(s => new Date(s.endDate).getTime());

    return {
      start: new Date(Math.min(...startDates)),
      end: new Date(Math.max(...endDates))
    };
  };

  const filterByTime = (dateString: string) => {
    const itemDate = new Date(dateString);
    const now = new Date();

    if (selectedYearId !== 'ALL') {
      const range = getYearRange(selectedYearId);
      if (range) {
        if (itemDate < range.start || itemDate > range.end) return false;
      }
    }

    if (timeFilter === 'ALL') return true;

    const diffTime = Math.abs(now.getTime() - itemDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (timeFilter === 'DAY') return diffDays <= 1;
    if (timeFilter === 'WEEK') return diffDays <= 7;
    if (timeFilter === 'MONTH') return diffDays <= 30;
    if (timeFilter === 'YEAR') return diffDays <= 365;
    return true;
  };

  const teacherStudentsCount = useMemo(() => {
    if (user?.role !== 'TEACHER') return users.filter(u => u.role === 'STUDENT').length;
    const classesList = classes.filter(c => c.teacherId === user.id);
    const studentIdsArr = classesList.flatMap(c => c.studentIds);
    const studentIdsSet = new Set(studentIdsArr.map(id => String(id)));
    return users.filter(u => u.role === 'STUDENT' && studentIdsSet.has(String(u.id))).length;
  }, [user, users, classes]);

  const filteredExams = exams.filter(e => filterByTime(e.createdAt));
  
  const filteredResources = resources
    .filter(r => user?.role !== 'TEACHER' || r.addedBy === user?.id)
    .filter(r => filterByTime(r.createdAt));

  const allActivities = useMemo(() => {
    type Activity = {
      id: string;
      type: 'NEW_EXAM' | 'SUBMISSION';
      title: string;
      time: Date;
      user: string | null;
    };

    const activities: Activity[] = [];

    exams.forEach(exam => {
      activities.push({
        id: `new_${exam.id}`,
        type: 'NEW_EXAM',
        title: `Bài tập mới: "${exam.title}"`,
        time: new Date(exam.createdAt),
        user: null
      });
    });

    attempts.forEach(att => {
      const studentName = users.find(u => u.id === att.studentId)?.name || 'Học sinh';
      const examTitle = exams.find(e => e.id === att.examId)?.title || 'Bài tập';
      activities.push({
        id: `att_${att.id}`,
        type: 'SUBMISSION',
        title: `${studentName} đã nộp bài "${examTitle}"`,
        time: new Date(att.submittedAt),
        user: att.studentId
      });
    });

    return activities.sort((a, b) => b.time.getTime() - a.time.getTime());
  }, [exams, attempts, users]);

  const recentActivities = useMemo(() => allActivities.slice(0, 5), [allActivities]);

  const handleExportActivities = () => {
    const headers = ['ID', 'Loại', 'Hoạt động', 'Thời gian'];
    const csvData = allActivities.map(act => [
      act.id,
      act.type === 'NEW_EXAM' ? 'Bài tập mới' : 'Nộp bài',
      `"${act.title}"`,
      act.time.toLocaleString('vi-VN')
    ]);

    const csvContent = [headers, ...csvData].map(e => e.join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `hoat_dong_gan_day_${new Date().toLocaleDateString()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " năm trước";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " tháng trước";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " ngày trước";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " giờ trước";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " phút trước";
    return "Vừa xong";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Khu vực quản trị, {user?.name} 👋</h1>
          <p className="text-gray-500 mt-1">Tổng quan hệ thống và tình hình lớp học.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedYearId}
            onChange={(e) => setSelectedYearId(e.target.value)}
            className="bg-white border hover:border-indigo-400 text-sm rounded-lg px-3 py-1.5 outline-none shadow-sm focus:ring-2 focus:ring-indigo-100 transition-all font-medium text-gray-700 cursor-pointer"
          >
            <option value="ALL">Tất cả năm học</option>
            {academicYears?.map(y => (
              <option key={y.id} value={y.id}>Năm học {y.name} {y.isActive ? '(Hiện tại)' : ''}</option>
            ))}
          </select>

          <div className="bg-white p-1 rounded-lg border shadow-sm flex items-center gap-1">
            {[
              { id: 'DAY', label: 'Hôm nay' },
              { id: 'WEEK', label: 'Tuần này' },
              { id: 'MONTH', label: 'Tháng này' },
              { id: 'YEAR', label: 'Năm nay' },
              { id: 'ALL', label: 'Tất cả' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setTimeFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${timeFilter === f.id ? 'bg-indigo-100 text-indigo-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 border shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-600">
            <LayoutGrid className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Quản lý Hồ sơ học tập</h3>
            <p className="text-sm text-gray-500">Xem nhanh chi tiết học tập, rèn luyện và AI phân tích cho từng học sinh.</p>
          </div>
        </div>
        <button 
          onClick={() => setIsStudentListModalOpen(true)}
          className="w-full md:w-auto px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
        >
          <Users className="h-5 w-5" /> HỒ SƠ HS
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={BookOpen} label="Tài liệu" value={filteredResources.length} color="bg-orange-500" />
        <StatCard icon={Users} label="Tổng học sinh" value={teacherStudentsCount} color="bg-green-500" />
        <StatCard icon={BookOpen} label="Tổng số bài tập" value={filteredExams.length} color="bg-blue-500" />
        <StatCard icon={TrendingUp} label="Lượt nộp bài" value={totalAttemptsCount} color="bg-indigo-500" />
      </div>

      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-xl border border-indigo-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-white p-3 rounded-2xl shadow-sm text-indigo-600">
            <BarChart3 className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Phân tích học tập chuyên sâu</h3>
            <p className="text-sm text-gray-600">Xem báo cáo chi tiết, điểm mạnh/yếu và gợi ý AI cho từng học sinh.</p>
          </div>
        </div>
        <Link 
          to="/teacher/analytics" 
          className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2 whitespace-nowrap"
        >
          <BarChart3 className="h-5 w-5" /> Xem Phân Tích Ngay
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-900">
              Hoạt động gần đây {user?.role === 'ADMIN' ? '(Toàn hệ thống)' : '(Của bạn)'}
            </h2>
            <div className="flex gap-2">
              <button 
                onClick={handleExportActivities}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-gray-600 bg-gray-50 border rounded-lg hover:bg-gray-100 transition-all"
                title="Xuất danh sách ra CSV"
              >
                <Download className="h-3.5 w-3.5" /> Xuất file
              </button>
              <button 
                onClick={() => setShowAllActivities(true)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg hover:bg-indigo-100 transition-all"
              >
                <List className="h-3.5 w-3.5" /> Xem toàn bộ
              </button>
            </div>
          </div>
          <div className="space-y-4">
            {recentActivities.map(act => (
              <div key={act.id} className="flex gap-3 items-start p-3 hover:bg-gray-50 rounded-lg transition-colors border border-transparent">
                <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 
                      ${act.type === 'NEW_EXAM' ? 'bg-blue-500' : 'bg-green-500'}`}>
                </div>
                <div>
                  <p className="text-sm text-gray-900">{act.title}</p>
                  <p className="text-xs text-gray-500">{getTimeAgo(act.time)}</p>
                </div>
              </div>
            ))}
            {recentActivities.length === 0 && <p className="text-gray-500 text-sm italic py-4">Chưa có hoạt động nào.</p>}
          </div>
        </div>
      </div>

      {showAllActivities && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[85vh]">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50/50 sticky top-0 rounded-t-2xl z-10">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                  <List className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Chi tiết hoạt động</h2>
                  <p className="text-xs text-gray-500">Toàn bộ lịch sử hoạt động trên hệ thống</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleExportActivities}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-700 bg-white border rounded-xl hover:bg-gray-50 shadow-sm transition-all"
                >
                  <Download className="h-4 w-4" /> Xuất CSV
                </button>
                <button onClick={() => setShowAllActivities(false)} className="hover:bg-gray-200 p-2 rounded-full transition-colors">
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
              {allActivities.map((act, idx) => (
                <div key={act.id} className="flex gap-4 items-center p-4 hover:bg-indigo-50/30 rounded-2xl transition-all border border-transparent hover:border-indigo-100/50 group">
                  <div className="text-xs font-bold text-gray-400 w-8">{allActivities.length - idx}</div>
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm
                      ${act.type === 'NEW_EXAM' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                    {act.type === 'NEW_EXAM' ? <BookOpen className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{act.title}</p>
                    <div className="flex items-center gap-3 mt-1">
                       <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider
                         ${act.type === 'NEW_EXAM' ? 'bg-blue-50 text-blue-500' : 'bg-emerald-50 text-emerald-500'}`}>
                         {act.type === 'NEW_EXAM' ? 'Bài tập mới' : 'Nộp bài'}
                       </span>
                       <span className="text-xs text-gray-400 flex items-center gap-1">
                         <Clock className="h-3 w-3" /> {act.time.toLocaleString('vi-VN')}
                       </span>
                    </div>
                  </div>
                </div>
              ))}
              {allActivities.length === 0 && (
                <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
                  <p className="text-gray-400 font-medium italic">Chưa có hoạt động nào được ghi nhận.</p>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t bg-gray-50/50 text-center rounded-b-2xl">
              <button 
                onClick={() => setShowAllActivities(false)} 
                className="bg-indigo-600 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-indigo-700 shadow-md shadow-indigo-100 transition-all active:scale-95"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student List Modal (Grid View) */}
      {isStudentListModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b flex justify-between items-center bg-indigo-50">
              <div>
                <h2 className="text-xl font-black text-indigo-900 flex items-center gap-2">
                  <LayoutGrid className="h-6 w-6" /> Hồ Sơ Học Sinh
                </h2>
                <p className="text-sm text-indigo-600 font-medium">Chọn học sinh để xem chi tiết hồ sơ học tập</p>
              </div>
              <button onClick={() => setIsStudentListModalOpen(false)} className="hover:bg-indigo-100 p-2 rounded-full transition-colors text-indigo-400">
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Filters */}
            <div className="p-6 bg-white border-b flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full text-indigo-900">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm học sinh theo tên..."
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all"
                  value={studentSearchQuery}
                  onChange={(e) => setStudentSearchQuery(e.target.value)}
                />
              </div>
              <select
                className="w-full md:w-64 px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold text-indigo-900 cursor-pointer transition-all"
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
              >
                <option value="ALL">Tất cả các lớp</option>
                {myClasses.map(c => (
                  <option key={c.id} value={c.id}>Lớp {c.name}</option>
                ))}
              </select>
            </div>

            {/* Modal Content - Grid */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30 custom-scrollbar">
              {filteredStudents.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100">
                  <p className="text-gray-400 font-medium italic">Không tìm thấy học sinh phù hợp.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredStudents.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setIsStudentListModalOpen(false);
                        navigate(`/teacher/portfolio/${s.id}`);
                      }}
                      className="group bg-white p-4 rounded-3xl border border-transparent hover:border-indigo-100 hover:shadow-xl hover:shadow-indigo-50 transition-all duration-300 flex flex-col items-center text-center"
                    >
                      <div className="relative mb-3">
                        <img
                          src={s.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=6366f1&color=fff&size=100`}
                          alt=""
                          className="w-20 h-20 rounded-2xl object-cover ring-4 ring-gray-50 group-hover:ring-indigo-50 transition-all"
                        />
                        <div className="absolute -bottom-1 -right-1 bg-white p-1 rounded-lg text-[10px] font-black shadow-sm group-hover:scale-110 transition-transform">
                          {s.className || 'N/A'}
                        </div>
                      </div>
                      <h4 className="text-sm font-black text-gray-800 group-hover:text-indigo-600 transition-colors line-clamp-1">{s.name}</h4>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">{s.email || 'Học sinh'}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t bg-gray-50 text-center font-bold text-xs text-gray-400">
              Tổng số: {filteredStudents.length} học sinh
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

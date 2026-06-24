import React, { useMemo, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { StatCard } from './StatCard';
import {
  BookOpen, Users, TrendingUp, Bell, CheckCircle,
  X, List, Download, BarChart3, Clock, LayoutGrid, Search,
  Trophy, StickyNote, Zap, Sparkles, ChevronRight, Calendar, GraduationCap
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
  const myClasses = useMemo(() => {
    if (user?.role === 'ADMIN') return classes;
    return classes.filter(c => c.teacherId === user?.id);
  }, [classes, user]);
  
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');

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
      const allStudentIds = myClasses.flatMap(c => c.studentIds || []);
      return users.filter(u => {
        const inStudentIds = allStudentIds.includes(u.id);
        const sClassName = (u.className || u.class_name || '').trim().toLowerCase();
        const actualClassName = sClassName.includes('|') ? sClassName.split('|')[1] : sClassName;
        const classIdFromProp = sClassName.includes('|') ? sClassName.split('|')[0] : '';
        const classNameMatch = myClasses.some(c => 
          (actualClassName && actualClassName === c.name.trim().toLowerCase()) ||
          (classIdFromProp && classIdFromProp === c.id.toLowerCase())
        );
        return inStudentIds || classNameMatch;
      });
    }
    const selectedClass = myClasses.find(c => c.id === selectedClassId);
    if (!selectedClass) return [];
    return users.filter(u => {
      const inStudentIds = selectedClass.studentIds?.includes(u.id);
      const sClassName = (u.className || u.class_name || '').trim().toLowerCase();
      const actualClassName = sClassName.includes('|') ? sClassName.split('|')[1] : sClassName;
      const classIdFromProp = sClassName.includes('|') ? sClassName.split('|')[0] : '';
      const classNameMatch = 
        (actualClassName && actualClassName === selectedClass.name.trim().toLowerCase()) ||
        (classIdFromProp && classIdFromProp === selectedClass.id.toLowerCase());
      return inStudentIds || classNameMatch;
    });
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Chào buổi sáng ☀️';
    if (hour < 18) return 'Chào buổi chiều 🌤️';
    return 'Chào buổi tối 🌙';
  };

  const getDailyInspirationalQuote = () => {
    const quotes = [
      "Chúc bạn một ngày làm việc tràn ngập năng lượng tích cực và gieo mầm nhiều tri thức quý giá!",
      "Chúc bạn một ngày giảng dạy tràn ngập niềm vui, sáng tạo và có sự kết nối sâu sắc với từng học sinh!",
      "Mỗi bài giảng hôm nay là một viên gạch xây đắp nên tương lai tươi sáng của thế hệ trẻ. Chúc bạn ngày mới tốt lành!",
      "Sự kiên nhẫn và tận tụy của bạn hôm nay chính là kim chỉ nam cho sự thành công của học trò ngày mai!",
      "Chúc bạn có một ngày làm việc trọn vẹn, ngập tràn cảm hứng sư phạm và niềm vui đứng lớp!",
      "Nghề dạy học là nghệ thuật thắp sáng ước mơ và đánh thức tiềm năng trong mỗi đứa trẻ. Chúc bạn một ngày rực rỡ!",
      "Mỗi học sinh là một tài năng đặc biệt đang đợi bạn khơi mở. Chúc bạn có một ngày giảng dạy thật ý nghĩa!",
      "Chúc bạn ngày mới tràn đầy nhiệt huyết giảng dạy, gặt hái thêm nhiều niềm vui và hạnh phúc bên học trò!",
      "Sự đồng hành của bạn chính là điểm tựa vững chắc nhất để học trò vững bước vào đời. Chúc bạn ngày mới an lành!",
      "Chúc bạn ngày mới tràn đầy ý tưởng bài giảng độc đáo và những giờ học sinh động đầy ắp tiếng cười!",
      "Học trò không chỉ nhớ những kiến thức bạn truyền đạt, mà sẽ nhớ mãi tình yêu thương và sự quan tâm của bạn. Ngày mới tràn ngập yêu thương nhé!",
      "Chúc bạn một ngày giảng dạy thật nhẹ nhàng nhưng mang lại giá trị to lớn và lan tỏa nguồn năng lượng tuyệt vời!",
      "Mỗi ngày đứng trên bục giảng là một ngày thay đổi tương lai. Chúc bạn có một ngày làm việc đầy cảm hứng!",
      "Sự tiến bộ từng ngày của học sinh là món quà quý giá nhất dành cho thầy cô. Chúc bạn một ngày hạnh phúc!",
      "Chúc bạn một ngày làm việc hiệu quả, luôn giữ vững ngọn lửa đam mê và niềm tự hào với sứ mệnh trồng người!"
    ];
    const day = new Date().getDate();
    return quotes[day % quotes.length];
  };

  return (
    <div className="space-y-8 pb-10">
      
      {/* 1. PREMIUM HERO WELCOME BANNER */}
      <div className="bg-gradient-to-br from-indigo-700 via-indigo-800 to-purple-900 rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-xl border border-indigo-900/50">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white/5 rounded-full -translate-y-1/3 translate-x-1/4 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 left-10 w-[300px] h-[300px] bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[11px] font-bold tracking-wider uppercase">
              <Sparkles className="h-3.5 w-3.5 text-indigo-200" /> Bảng điều khiển Quản trị
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">
              {getGreeting()}, {user?.name}
            </h1>
            <p className="text-indigo-100 text-sm md:text-base max-w-xl leading-relaxed">
              Hôm nay là ngày {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}. {getDailyInspirationalQuote()}
            </p>
          </div>

          {/* Banner Filters */}
          <div className="flex flex-wrap items-center gap-3 bg-black/10 p-3 rounded-2xl backdrop-blur-md border border-white/5">
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-black text-indigo-200 uppercase tracking-widest px-1">Năm học</span>
              <select
                value={selectedYearId}
                onChange={(e) => setSelectedYearId(e.target.value)}
                className="bg-white/15 hover:bg-white/20 border-none text-white text-xs rounded-xl px-3 py-2 outline-none font-bold cursor-pointer transition-all min-w-[150px]"
              >
                <option value="ALL" className="text-gray-900">Tất cả năm học</option>
                {academicYears?.map(y => (
                  <option key={y.id} value={y.id} className="text-gray-900">Năm {y.name} {y.isActive ? '(Hiện tại)' : ''}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-black text-indigo-200 uppercase tracking-widest px-1">Bộ lọc thời gian</span>
              <div className="flex bg-white/10 p-0.5 rounded-xl border border-white/5">
                {[
                  { id: 'ALL', label: 'Tất cả' },
                  { id: 'MONTH', label: 'Tháng' },
                  { id: 'WEEK', label: 'Tuần' },
                  { id: 'DAY', label: 'Hôm nay' }
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setTimeFilter(f.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${timeFilter === f.id ? 'bg-white text-indigo-900 shadow-sm' : 'text-indigo-100 hover:text-white hover:bg-white/5'}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. STATS CARDS SECTION WITH GRADIENT ACCENTS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Users, label: 'Tổng số Học sinh', value: teacherStudentsCount, color: 'from-emerald-500 to-teal-600', bg: 'from-emerald-50 to-white', border: 'border-emerald-100', text: 'text-emerald-950', iconColor: 'text-emerald-600' },
          { icon: BookOpen, label: 'Bài tập đã tạo', value: filteredExams.length, color: 'from-blue-500 to-indigo-600', bg: 'from-blue-50 to-white', border: 'border-blue-100', text: 'text-blue-950', iconColor: 'text-blue-600' },
          { icon: TrendingUp, label: 'Tổng lượt nộp bài', value: totalAttemptsCount, color: 'from-indigo-500 to-purple-600', bg: 'from-indigo-50 to-white', border: 'border-indigo-100', text: 'text-indigo-950', iconColor: 'text-indigo-600' },
          { icon: BookOpen, label: 'Kho tài liệu & Web', value: filteredResources.length, color: 'from-amber-500 to-orange-600', bg: 'from-amber-50 to-white', border: 'border-amber-100', text: 'text-amber-950', iconColor: 'text-amber-600' }
        ].map((card, i) => (
          <div key={i} className={`bg-gradient-to-br ${card.bg} p-5 rounded-2xl border ${card.border} shadow-xs relative overflow-hidden group hover:shadow-md transition-all duration-300`}>
            <div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-br ${card.color} opacity-5 rounded-bl-full group-hover:scale-110 transition-transform duration-300`} />
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{card.label}</span>
              <div className={`p-2 rounded-xl bg-white shadow-xs ${card.iconColor}`}>
                <card.icon className="h-4.5 w-4.5 group-hover:rotate-12 transition-transform" />
              </div>
            </div>
            <div className={`text-2xl font-black ${card.text}`}>{card.value}</div>
            <div className="text-[10px] text-gray-400 mt-1">Dữ liệu cập nhật liên tục</div>
          </div>
        ))}
      </div>

      {/* 3. INTERACTIVE SHORTCUT HUBS */}
      <div className="space-y-4">
        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">Trung tâm tiện ích giáo viên (Management Hubs)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Hub 1: Student Portfolio */}
          <button
            onClick={() => setIsStudentListModalOpen(true)}
            className="text-left bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-50/40 transition-all duration-300 flex flex-col justify-between h-48"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-full group-hover:scale-110 transition-all duration-300" />
            <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600 w-fit relative z-10">
              <Users className="h-6 w-6" />
            </div>
            <div className="space-y-1.5 relative z-10">
              <h3 className="font-extrabold text-gray-900 group-hover:text-indigo-600 transition-colors text-base flex items-center gap-1.5">
                Hồ Sơ Học Sinh <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">Xem nhanh chi tiết kết quả học tập, điểm thi đua và quá trình rèn luyện cá nhân.</p>
            </div>
          </button>

          {/* Hub 2: Learning Analytics */}
          <Link
            to="/teacher/analytics"
            className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group hover:border-purple-200 hover:shadow-lg hover:shadow-purple-50/40 transition-all duration-300 flex flex-col justify-between h-48"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-bl-full group-hover:scale-110 transition-all duration-300" />
            <div className="p-3 bg-purple-50 rounded-2xl text-purple-600 w-fit relative z-10">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div className="space-y-1.5 relative z-10">
              <h3 className="font-extrabold text-gray-900 group-hover:text-purple-600 transition-colors text-base flex items-center gap-1.5">
                Phân Tích Học Tập AI <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">Báo cáo điểm mạnh/yếu, phân tích phổ điểm thi cử và g gợi ý sư phạm tự động từ AI.</p>
            </div>
          </Link>

          {/* Hub 3: Class Competition */}
          <Link
            to="/teacher/class-fun"
            className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-50/40 transition-all duration-300 flex flex-col justify-between h-48"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full group-hover:scale-110 transition-all duration-300" />
            <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600 w-fit relative z-10">
              <Trophy className="h-6 w-6" />
            </div>
            <div className="space-y-1.5 relative z-10">
              <h3 className="font-extrabold text-gray-900 group-hover:text-emerald-600 transition-colors text-base flex items-center gap-1.5">
                Thi Đua Lớp Học <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">Quản lý điểm cộng/trừ rèn luyện của học sinh, điểm danh và thống kê kinh nghiệm XP lớp học.</p>
            </div>
          </Link>

          {/* Hub 4: Notebook */}
          <Link
            to="/teacher/notes"
            className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group hover:border-amber-200 hover:shadow-lg hover:shadow-amber-50/40 transition-all duration-300 flex flex-col justify-between h-48"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-full group-hover:scale-110 transition-all duration-300" />
            <div className="p-3 bg-amber-50 rounded-2xl text-amber-600 w-fit relative z-10">
              <StickyNote className="h-6 w-6" />
            </div>
            <div className="space-y-1.5 relative z-10">
              <h3 className="font-extrabold text-gray-900 group-hover:text-amber-600 transition-colors text-base flex items-center gap-1.5">
                Sổ Tay Sư Phạm <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">Không gian ghi chú kế hoạch giảng dạy, nhắc nhở công việc họp và ghim danh sách việc cần làm.</p>
            </div>
          </Link>

        </div>
      </div>

      {/* 4. RECENT SYSTEM TIMELINE ACTIVITIES & DETAILS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Timeline Block */}
        <div className="bg-white p-6 rounded-3xl border shadow-sm lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-extrabold text-gray-900 text-base flex items-center gap-2">
              <Clock className="h-5 w-5 text-indigo-500" /> Hoạt động gần đây {user?.role === 'ADMIN' ? '(Toàn hệ thống)' : '(Lớp của bạn)'}
            </h2>
            <div className="flex gap-2">
              <button 
                onClick={handleExportActivities}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-gray-600 bg-gray-50 border rounded-xl hover:bg-gray-100 active:scale-95 transition-all"
                title="Xuất danh sách ra CSV"
              >
                <Download className="h-3.5 w-3.5" /> Xuất file
              </button>
              <button 
                onClick={() => setShowAllActivities(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-xl hover:bg-indigo-100 active:scale-95 transition-all"
              >
                <List className="h-3.5 w-3.5" /> Xem toàn bộ
              </button>
            </div>
          </div>

          {/* Grid Layout of Activities */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentActivities.map(act => {
              const isExam = act.type === 'NEW_EXAM';
              return (
                <div 
                  key={act.id} 
                  className={`p-4 rounded-2xl border transition-all duration-300 hover:shadow-md flex flex-col justify-between
                    ${isExam 
                      ? 'bg-gradient-to-br from-blue-50/30 to-white border-blue-100/60 hover:border-blue-200' 
                      : 'bg-gradient-to-br from-emerald-50/30 to-white border-emerald-100/60 hover:border-emerald-200'
                    }`}
                >
                  <div className="flex gap-3 items-start">
                    <div className={`p-2 rounded-xl shrink-0
                      ${isExam ? 'bg-blue-100/80 text-blue-600' : 'bg-emerald-100/80 text-emerald-600'}`}>
                      {isExam ? <BookOpen className="h-4.5 w-4.5" /> : <CheckCircle className="h-4.5 w-4.5" />}
                    </div>
                    <div className="space-y-1">
                      <span className={`text-[9px] px-2 py-0.5 rounded-md font-extrabold uppercase tracking-wider
                        ${isExam ? 'bg-blue-100/50 text-blue-700' : 'bg-emerald-100/50 text-emerald-700'}`}>
                        {isExam ? 'Bài tập mới' : 'Nộp bài'}
                      </span>
                      <h4 className="text-sm font-bold text-gray-800 line-clamp-2 leading-snug pt-1">
                        {act.title}
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-100/60 text-gray-400 text-[10px] font-medium">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {getTimeAgo(act.time)}
                    </span>
                    <span className="text-indigo-500 font-bold hover:underline cursor-pointer">Chi tiết</span>
                  </div>
                </div>
              );
            })}
            {recentActivities.length === 0 && (
              <div className="col-span-full text-center py-8 text-gray-400 italic text-sm">
                Hệ thống chưa phát sinh hoạt động nào trong khoảng thời gian đã chọn.
              </div>
            )}
          </div>
        </div>

        {/* Informative Side Widgets */}
        <div className="space-y-6">
          
          {/* Quick Stats Widget */}
          <div className="bg-gradient-to-r from-violet-600 via-indigo-600 to-indigo-700 p-6 rounded-3xl text-white relative overflow-hidden shadow-md">
            <div className="absolute top-0 right-0 w-[150px] h-[150px] bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-xl pointer-events-none" />
            <h3 className="font-extrabold text-sm uppercase tracking-wider text-violet-200">Trợ Lý Sư Phạm AI</h3>
            <p className="text-xs text-indigo-50 mt-3 leading-relaxed">
              Bạn có thể sử dụng tính năng **Phân tích Học tập** hoặc tính năng **Chấm bài tự động AI** để giảm bớt 70% thời gian chấm bài viết tay và nhận xét học bạ định kỳ cho học sinh.
            </p>
            <div className="mt-5 flex gap-2">
              <Link 
                to="/teacher/ai-grading" 
                className="bg-white/15 hover:bg-white/20 px-3.5 py-2 rounded-xl text-xs font-bold text-white transition-all text-center flex-1 border border-white/5 shadow-xs"
              >
                Chấm Bài AI
              </Link>
              <Link 
                to="/teacher/analytics" 
                className="bg-white text-indigo-700 hover:bg-indigo-50 px-3.5 py-2 rounded-xl text-xs font-bold transition-all text-center flex-1 shadow-md"
              >
                Xem Phân Tích
              </Link>
            </div>
          </div>

          {/* Quick Info Widget */}
          <div className="bg-white p-6 rounded-3xl border shadow-sm">
            <h3 className="font-extrabold text-gray-800 text-sm flex items-center gap-2">
              <Calendar className="h-4.5 w-4.5 text-indigo-500" /> Trạng thái Đồng bộ
            </h3>
            <div className="mt-4 space-y-3.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 font-medium">Kết nối Supabase</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-100">
                  <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-ping" /> Trực tuyến
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 font-medium">Bảng ghi chú sư phạm</span>
                <span className="text-gray-700 font-semibold">Tự động sao lưu kép</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 font-medium">Thời gian đồng bộ cuối</span>
                <span className="text-gray-400 font-semibold">Vừa xong</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* SHOW ALL ACTIVITIES MODAL */}
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
                  className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-700 bg-white border rounded-xl hover:bg-gray-50 shadow-sm transition-all animate-in zoom-in-95"
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

import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { ExamCreate } from './pages/ExamCreate';
import { ExamMatrix } from './pages/ExamMatrix';
import QuestionBank from './pages/QuestionBank';
import { AIStats } from './pages/AIStats';
import { ExamList } from './pages/ExamList';
import { PublicLibrary } from './pages/PublicLibrary';
import { ExamTake } from './pages/ExamTake';
import { AcademicYearManage } from './pages/admin/AcademicYearManage';
import { UserManage } from './pages/manage/UserManage';
import { ClassManage } from './pages/teacher/ClassManage';
import { ClassFunDashboard } from './pages/teacher/ClassFunDashboard';
import { ClassFunRecord } from './pages/teacher/ClassFunRecord';
import { ClassFunAttendance } from './pages/teacher/ClassFunAttendance';
import { ClassFunWarning } from './pages/teacher/ClassFunWarning';
import { DailyEvaluation } from './pages/teacher/DailyEvaluation';
import { EvaluationHistory } from './pages/teacher/EvaluationHistory';
import { AIGrading } from './pages/teacher/AIGrading';
import { LiveRoom } from './pages/teacher/LiveRoom';
import { LiveJoin } from './pages/student/LiveJoin';
import { LiveLobby } from './pages/student/LiveLobby';
// Discussion imports
import { DiscussionRoom } from './pages/teacher/DiscussionRoom';
import { StudentDiscussionRoom } from './pages/student/DiscussionRoom';
import { DiscussionJoin } from './pages/student/DiscussionJoin';
import { DiscussionList } from './pages/teacher/DiscussionList';
import { DiscussionCreate } from './pages/teacher/DiscussionCreate';
import { ExamResults } from './pages/teacher/ExamResults';
import { AssignmentManage } from './pages/teacher/AssignmentManage';
import { StudentXPStats } from './pages/teacher/StudentXPStats';
import { TeacherAnalytics } from './pages/teacher/TeacherAnalytics';
// Student History
import { StudentHistory } from './pages/student/StudentHistory';
// Student Analytics
import { LearningAnalytics } from './pages/student/LearningAnalytics';
// Settings
import { Settings } from './pages/Settings';
// Resources
import { ResourceLibrary } from './pages/ResourceLibrary';
import { ArenaHome } from './pages/arena/ArenaHome';
import { ArenaDashboard } from './pages/arena/ArenaDashboard';
import { TowerMode } from './pages/arena/TowerMode';
import { PvPLobby } from './pages/arena/PvPLobby';
import { PvPBattle } from './pages/arena/PvPBattle';
import { MatchResult } from './pages/arena/MatchResult';
import { Leaderboard } from './pages/arena/Leaderboard';
import { ArenaAdmin } from './pages/arena/ArenaAdmin';
import { TournamentHost } from './pages/arena/TournamentHost';
import { TournamentLobby } from './pages/arena/TournamentLobby';
// Portfolio
import { StudentPortfolio } from './pages/teacher/StudentPortfolio';
import { MyPortfolio } from './pages/student/MyPortfolio';

// Tools
import { CountdownTimer } from './pages/tools/CountdownTimer';

// EduGames SSO Bridge
import { EduGamesRedirect } from './pages/EduGamesRedirect';

// PARENT PORTAL
import { ParentLogin } from './pages/parent/ParentLogin';
import { ParentDashboard } from './pages/parent/ParentDashboard';
import { ParentEvaluations } from './pages/parent/ParentEvaluations';
import { ParentBehavior } from './pages/parent/ParentBehavior';
import { ParentExamHistory } from './pages/parent/ParentExamHistory';
import { useParentStore } from './services/parentStore';

import { supabase } from './services/supabaseClient';
import { useStore } from './store';
import { UserRole } from './types';
import { Loader2, LogIn, Key, Mail, Eye, EyeOff, X } from 'lucide-react';

const Login = () => {
  const { setUser, users } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleRealLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const searchEmail = email.trim().toLowerCase();
    
    // Tạo email ảo từ username nếu học sinh nhập mã (ví dụ: an5a1 -> an5a1@openlms.edu)
    let formattedEmail = searchEmail;
    if (!formattedEmail.includes('@')) {
      formattedEmail = `${formattedEmail}@openlms.edu`;
    }

    try {
      // 1. Thực hiện đăng nhập bảo mật qua Supabase Auth
      const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: formattedEmail,
        password: password
      });

      if (authData?.user) {
        // Tải profile tương ứng
        const { data: realProfile, error: profileErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id)
          .maybeSingle();

        if (realProfile) {
          setUser(realProfile);
          return;
        }
      }

      setError('Email hoặc mật khẩu không chính xác.');
    } catch (err) {
      console.error("Login error:", err);
      setError('Có lỗi xảy ra khi kết nối. Vui lòng thử lại.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <div className="h-16 w-16 bg-indigo-600 rounded-xl flex items-center justify-center text-white text-2xl font-bold">
            LM
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">OpenLMS</h1>
        <p className="text-gray-500 mb-6">Hệ thống quản lý học tập & thi cử</p>

        {/* Real Login Form */}
        <form onSubmit={handleRealLogin} className="space-y-4 mb-4 text-left">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Tên đăng nhập / Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                autoCapitalize="none"
                className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                placeholder="admin@school.edu hoặc an5a1"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Mật khẩu</label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type={showPassword ? "text" : "password"}
                className="w-full border border-gray-300 rounded-lg pl-10 pr-10 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-gray-400">Admin mặc định: 123456</span>
              <button 
                type="button" 
                onClick={() => setShowForgotPassword(true)}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Quên mật khẩu?
              </button>
            </div>
          </div>

          {error && <p className="text-red-500 text-sm font-medium text-center">{error}</p>}

          <button type="submit" className="w-full bg-indigo-600 text-white p-3 rounded-lg font-bold hover:bg-indigo-700 transition-colors flex justify-center items-center gap-2">
            <LogIn className="h-4 w-4" /> Đăng nhập
          </button>
          
          <a href="/parent/login" className="mt-4 w-full bg-emerald-50 text-emerald-700 p-3 rounded-lg font-bold hover:bg-emerald-100 transition-colors flex justify-center items-center gap-2 border border-emerald-200">
            Dành cho Phụ huynh học sinh
          </a>
        </form>

        {/* Forgot Password Modal */}
        {showForgotPassword && (
          <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-fade-in text-left">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">Khôi phục mật khẩu?</h3>
                <button onClick={() => setShowForgotPassword(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl mb-4 text-indigo-800 text-sm">
                <p className="font-bold flex items-center gap-2 mb-2">
                  <Mail className="h-4 w-4" /> Email Admin:
                </p>
                <p className="font-mono bg-white/50 p-2 rounded border border-indigo-200 break-all">ptchau708@gmail.com</p>
                <p className="mt-4 opacity-90 leading-relaxed">
                  Để bảo mật cao nhất, mật khẩu sẽ không hiển thị tại đây. 
                  Bạn có thể reset mật khẩu trực tiếp qua cơ sở dữ liệu hoặc liên hệ hỗ trợ kỹ thuật.
                </p>
              </div>
              <button 
                onClick={() => setShowForgotPassword(false)}
                className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-bold hover:bg-indigo-700 transition-all"
              >
                Tôi đã hiểu
              </button>
            </div>
          </div>
        )}

        <p className="mt-6 text-xs text-gray-400">
          *Hệ thống mã nguồn mở
        </p>
      </div>
    </div>
  );
};

const ProtectedRoute: React.FC<{ children: React.ReactNode; roles?: UserRole[] }> = ({ children, roles }) => {
  const { user } = useStore();
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;
  return <Layout>{children}</Layout>;
};

const LoginRoute = () => {
  const { user } = useStore();
  const location = useLocation();
  const from = location.state?.from?.pathname + (location.state?.from?.search || '') || "/";
  if (user) return <Navigate to={from} replace />;
  return <Login />;
};

const ParentProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentParent } = useParentStore();
  const location = useLocation();
  if (!currentParent) return <Navigate to="/parent/login" state={{ from: location }} replace />;
  return <>{children}</>;
};

const ParentLoginRoute = () => {
  const { currentParent } = useParentStore();
  const location = useLocation();
  if (currentParent) return <Navigate to="/parent/dashboard" replace />;
  return <ParentLogin />;
};

function App() {
  const { user, fetchInitialData, isDataLoading } = useStore();

  // Load data once when app starts
  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  if (isDataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-10 w-10 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Đang tải dữ liệu từ Cloud...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginRoute />} />

        {/* PARENT ROUTES */}
        <Route path="/parent/login" element={<ParentLoginRoute />} />
        <Route path="/parent/dashboard" element={<ParentProtectedRoute><ParentDashboard /></ParentProtectedRoute>} />
        <Route path="/parent/evaluations" element={<ParentProtectedRoute><ParentEvaluations /></ParentProtectedRoute>} />
        <Route path="/parent/behavior" element={<ParentProtectedRoute><ParentBehavior /></ParentProtectedRoute>} />
        <Route path="/parent/exams" element={<ParentProtectedRoute><ParentExamHistory /></ParentProtectedRoute>} />

        <Route path="/" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />

        {/* ADMIN ROUTES */}
        <Route path="/admin/years" element={
          <ProtectedRoute roles={['ADMIN']}>
            <AcademicYearManage />
          </ProtectedRoute>
        } />
        <Route path="/admin/teachers" element={
          <ProtectedRoute roles={['ADMIN']}>
            <UserManage targetRole="TEACHER" title="Quản lý Giáo Viên" />
          </ProtectedRoute>
        } />

        {/* ADMIN & TEACHER SHARED */}
        <Route path="/manage/students" element={
          <ProtectedRoute roles={['ADMIN', 'TEACHER']}>
            <UserManage targetRole="STUDENT" title="Quản lý Học Sinh" />
          </ProtectedRoute>
        } />

        {/* TEACHER ROUTES */}
        <Route path="/teacher/daily-evaluation" element={
          <ProtectedRoute roles={['TEACHER']}>
            <DailyEvaluation />
          </ProtectedRoute>
        } />
        <Route path="/teacher/evaluation-history" element={
          <ProtectedRoute roles={['TEACHER']}>
            <EvaluationHistory />
          </ProtectedRoute>
        } />
        
        <Route path="/create-exam" element={
          <ProtectedRoute roles={['TEACHER']}>
            <ExamCreate />
          </ProtectedRoute>
        } />
        <Route path="/exam-matrix" element={
          <ProtectedRoute roles={['TEACHER']}>
            <ExamMatrix />
          </ProtectedRoute>
        } />
        <Route path="/question-bank" element={
          <ProtectedRoute roles={['TEACHER', 'ADMIN']}>
            <QuestionBank />
          </ProtectedRoute>
        } />
        <Route path="/ai-stats" element={
          <ProtectedRoute roles={['TEACHER']}>
            <AIStats />
          </ProtectedRoute>
        } />
        <Route path="/teacher/classes" element={
          <ProtectedRoute roles={['TEACHER']}>
            <ClassManage />
          </ProtectedRoute>
        } />
        <Route path="/teacher/class-fun" element={
          <ProtectedRoute roles={['TEACHER']}>
            <ClassFunDashboard />
          </ProtectedRoute>
        } />
        <Route path="/teacher/class-fun/record" element={
          <ProtectedRoute roles={['TEACHER']}>
            <ClassFunRecord />
          </ProtectedRoute>
        } />
        <Route path="/teacher/class-fun/attendance" element={
          <ProtectedRoute roles={['TEACHER']}>
            <ClassFunAttendance />
          </ProtectedRoute>
        } />
        <Route path="/teacher/class-fun/warning" element={
          <ProtectedRoute roles={['TEACHER']}>
            <ClassFunWarning />
          </ProtectedRoute>
        } />
        <Route path="/teacher/ai-grading" element={
          <ProtectedRoute roles={['TEACHER']}>
            <AIGrading />
          </ProtectedRoute>
        } />
        <Route path="/teacher/assignments" element={
          <ProtectedRoute roles={['TEACHER']}>
            <AssignmentManage />
          </ProtectedRoute>
        } />
        <Route path="/teacher/xp-stats" element={
          <ProtectedRoute roles={['TEACHER']}>
            <StudentXPStats />
          </ProtectedRoute>
        } />
        <Route path="/teacher/analytics" element={
          <ProtectedRoute roles={['TEACHER']}>
            <TeacherAnalytics />
          </ProtectedRoute>
        } />

        {/* LIVE EXAM ROUTES */}
        <Route path="/live/host/:pin" element={
          <ProtectedRoute roles={['TEACHER', 'ADMIN']}>
            <LiveRoom />
          </ProtectedRoute>
        } />
        <Route path="/live/join" element={<LiveJoin />} />
        <Route path="/live/lobby/:pin" element={
          <ProtectedRoute roles={['STUDENT']}>
            <LiveLobby />
          </ProtectedRoute>
        } />

        {/* DISCUSSION ROOM ROUTES */}
        <Route path="/discussion/join" element={<DiscussionJoin />} />

        <Route path="/teacher/discussions" element={
          <ProtectedRoute roles={['TEACHER']}>
            <DiscussionList />
          </ProtectedRoute>
        } />

        <Route path="/teacher/discussions/create" element={
          <ProtectedRoute roles={['TEACHER']}>
            <DiscussionCreate />
          </ProtectedRoute>
        } />

        <Route path="/discussion/room/:pin" element={
          user?.role === 'TEACHER' ? (
            <ProtectedRoute roles={['TEACHER']}>
              <DiscussionRoom />
            </ProtectedRoute>
          ) : (
            <StudentDiscussionRoom />
          )
        } />


        {/* PUBLIC/SHARED */}
        <Route path="/exams" element={
          <ProtectedRoute>
            <ExamList />
          </ProtectedRoute>
        } />

        <Route path="/library" element={
          <ProtectedRoute roles={['TEACHER', 'ADMIN']}>
            <PublicLibrary />
          </ProtectedRoute>
        } />

        <Route path="/resources" element={
          <ProtectedRoute>
            <ResourceLibrary />
          </ProtectedRoute>
        } />

        <Route path="/edu-games" element={
          <ProtectedRoute>
             <EduGamesRedirect />
          </ProtectedRoute>
        } />

        <Route path="/exam/:id/take" element={
          <ProtectedRoute>
            <ExamTake />
          </ProtectedRoute>
        } />

        <Route path="/exam/:id/results" element={
          <ProtectedRoute roles={['TEACHER', 'ADMIN']}>
            <ExamResults />
          </ProtectedRoute>
        } />

        {/* STUDENT ROUTES */}
        <Route path="/student/history" element={
          <ProtectedRoute roles={['STUDENT']}>
            <StudentHistory />
          </ProtectedRoute>
        } />

        <Route path="/student/analytics" element={
          <ProtectedRoute roles={['STUDENT']}>
            <LearningAnalytics />
          </ProtectedRoute>
        } />

        <Route path="/student/portfolio" element={
          <ProtectedRoute roles={['STUDENT']}>
            <MyPortfolio />
          </ProtectedRoute>
        } />

        <Route path="/teacher/portfolio/:studentId" element={
          <ProtectedRoute roles={['TEACHER', 'ADMIN']}>
            <StudentPortfolio />
          </ProtectedRoute>
        } />

        <Route path="/settings" element={
          <ProtectedRoute roles={['TEACHER', 'ADMIN']}>
            <Settings />
          </ProtectedRoute>
        } />

        <Route path="/tools/timer" element={
          <ProtectedRoute roles={['TEACHER', 'ADMIN']}>
            <CountdownTimer />
          </ProtectedRoute>
        } />

        {/* ARENA ROUTES */}
        <Route path="/arena" element={
          <ProtectedRoute roles={['STUDENT']}>
            <ArenaHome />
          </ProtectedRoute>
        } />
        <Route path="/arena/dashboard" element={
          <ProtectedRoute roles={['STUDENT']}>
            <ArenaDashboard />
          </ProtectedRoute>
        } />
        <Route path="/arena/tower" element={
          <ProtectedRoute roles={['STUDENT']}>
            <TowerMode />
          </ProtectedRoute>
        } />
        <Route path="/arena/pvp" element={
          <ProtectedRoute roles={['STUDENT']}>
            <PvPLobby />
          </ProtectedRoute>
        } />
        <Route path="/arena/battle/:id" element={
          <ProtectedRoute roles={['STUDENT']}>
            <PvPBattle />
          </ProtectedRoute>
        } />
        <Route path="/arena/result/:id" element={
          <ProtectedRoute roles={['STUDENT']}>
            <MatchResult />
          </ProtectedRoute>
        } />
        <Route path="/arena/leaderboard" element={
          <ProtectedRoute>
            <Leaderboard />
          </ProtectedRoute>
        } />
        <Route path="/arena/admin" element={
          <ProtectedRoute roles={['TEACHER', 'ADMIN']}>
            <ArenaAdmin />
          </ProtectedRoute>
        } />

        {/* TOURNAMENT ROUTES */}
        <Route path="/arena/tournament/host" element={
          <ProtectedRoute roles={['TEACHER', 'ADMIN']}>
            <TournamentHost />
          </ProtectedRoute>
        } />
        <Route path="/arena/tournament/host/:id" element={
          <ProtectedRoute roles={['TEACHER', 'ADMIN']}>
            <TournamentHost />
          </ProtectedRoute>
        } />
        <Route path="/arena/tournament/:id" element={
          <ProtectedRoute roles={['STUDENT']}>
            <TournamentLobby />
          </ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

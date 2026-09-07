import React, { useEffect, useState, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { PageSkeleton } from './components/PageSkeleton';
import { useParentStore } from './services/parentStore';
import { supabase } from './services/supabaseClient';
import { useStore } from './store';
import { UserRole } from './types';
import { Loader2, LogIn, Key, Mail, Eye, EyeOff, X, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

// LAZY LOADED ROUTE COMPONENTS
const ResetPassword = lazy(() => import('./pages/ResetPassword').then(m => ({ default: m.ResetPassword })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const ExamCreate = lazy(() => import('./pages/ExamCreate').then(m => ({ default: m.ExamCreate })));
const ExamMatrix = lazy(() => import('./pages/ExamMatrix').then(m => ({ default: m.ExamMatrix })));
const QuestionBank = lazy(() => import('./pages/QuestionBank'));
const AIStats = lazy(() => import('./pages/AIStats').then(m => ({ default: m.AIStats })));
const ExamList = lazy(() => import('./pages/ExamList').then(m => ({ default: m.ExamList })));
const PublicLibrary = lazy(() => import('./pages/PublicLibrary').then(m => ({ default: m.PublicLibrary })));
const ExamTake = lazy(() => import('./pages/ExamTake').then(m => ({ default: m.ExamTake })));
const AcademicYearManage = lazy(() => import('./pages/admin/AcademicYearManage').then(m => ({ default: m.AcademicYearManage })));
const UserManage = lazy(() => import('./pages/manage/UserManage').then(m => ({ default: m.UserManage })));
const ClassManage = lazy(() => import('./pages/teacher/ClassManage').then(m => ({ default: m.ClassManage })));
const ClassFunDashboard = lazy(() => import('./pages/teacher/ClassFunDashboard').then(m => ({ default: m.ClassFunDashboard })));
const ClassFunRecord = lazy(() => import('./pages/teacher/ClassFunRecord').then(m => ({ default: m.ClassFunRecord })));
const ClassFunAttendance = lazy(() => import('./pages/teacher/ClassFunAttendance').then(m => ({ default: m.ClassFunAttendance })));
const ClassFunWarning = lazy(() => import('./pages/teacher/ClassFunWarning').then(m => ({ default: m.ClassFunWarning })));
const DailyEvaluation = lazy(() => import('./pages/teacher/DailyEvaluation').then(m => ({ default: m.DailyEvaluation })));
const EvaluationHistory = lazy(() => import('./pages/teacher/EvaluationHistory').then(m => ({ default: m.EvaluationHistory })));
const AIGrading = lazy(() => import('./pages/teacher/AIGrading').then(m => ({ default: m.AIGrading })));
const LiveRoom = lazy(() => import('./pages/teacher/LiveRoom').then(m => ({ default: m.LiveRoom })));
const LiveJoin = lazy(() => import('./pages/student/LiveJoin').then(m => ({ default: m.LiveJoin })));
const LiveLobby = lazy(() => import('./pages/student/LiveLobby').then(m => ({ default: m.LiveLobby })));
const DiscussionRoom = lazy(() => import('./pages/teacher/DiscussionRoom').then(m => ({ default: m.DiscussionRoom })));
const StudentDiscussionRoom = lazy(() => import('./pages/student/DiscussionRoom').then(m => ({ default: m.StudentDiscussionRoom })));
const DiscussionJoin = lazy(() => import('./pages/student/DiscussionJoin').then(m => ({ default: m.DiscussionJoin })));
const DiscussionList = lazy(() => import('./pages/teacher/DiscussionList').then(m => ({ default: m.DiscussionList })));
const DiscussionCreate = lazy(() => import('./pages/teacher/DiscussionCreate').then(m => ({ default: m.DiscussionCreate })));
const ExamResults = lazy(() => import('./pages/teacher/ExamResults').then(m => ({ default: m.ExamResults })));
const AssignmentManage = lazy(() => import('./pages/teacher/AssignmentManage').then(m => ({ default: m.AssignmentManage })));
const StudentXPStats = lazy(() => import('./pages/teacher/StudentXPStats').then(m => ({ default: m.StudentXPStats })));
const TeacherAnalytics = lazy(() => import('./pages/teacher/TeacherAnalytics').then(m => ({ default: m.TeacherAnalytics })));
const TeacherNotes = lazy(() => import('./pages/teacher/TeacherNotes').then(m => ({ default: m.TeacherNotes })));
const StudentHistory = lazy(() => import('./pages/student/StudentHistory').then(m => ({ default: m.StudentHistory })));
const LearningAnalytics = lazy(() => import('./pages/student/LearningAnalytics').then(m => ({ default: m.LearningAnalytics })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const ResourceLibrary = lazy(() => import('./pages/ResourceLibrary').then(m => ({ default: m.ResourceLibrary })));
const ArenaHome = lazy(() => import('./pages/arena/ArenaHome').then(m => ({ default: m.ArenaHome })));
const ArenaDashboard = lazy(() => import('./pages/arena/ArenaDashboard').then(m => ({ default: m.ArenaDashboard })));
const TowerMode = lazy(() => import('./pages/arena/TowerMode').then(m => ({ default: m.TowerMode })));
const PvPLobby = lazy(() => import('./pages/arena/PvPLobby').then(m => ({ default: m.PvPLobby })));
const PvPBattle = lazy(() => import('./pages/arena/PvPBattle').then(m => ({ default: m.PvPBattle })));
const MatchResult = lazy(() => import('./pages/arena/MatchResult').then(m => ({ default: m.MatchResult })));
const Leaderboard = lazy(() => import('./pages/arena/Leaderboard').then(m => ({ default: m.Leaderboard })));
const ArenaAdmin = lazy(() => import('./pages/arena/ArenaAdmin').then(m => ({ default: m.ArenaAdmin })));
const TournamentHost = lazy(() => import('./pages/arena/TournamentHost').then(m => ({ default: m.TournamentHost })));
const TournamentLobby = lazy(() => import('./pages/arena/TournamentLobby').then(m => ({ default: m.TournamentLobby })));
const ArenaShop = lazy(() => import('./pages/arena/ArenaShop').then(m => ({ default: m.ArenaShop })));
const StudentPortfolio = lazy(() => import('./pages/teacher/StudentPortfolio').then(m => ({ default: m.StudentPortfolio })));
const MyPortfolio = lazy(() => import('./pages/student/MyPortfolio').then(m => ({ default: m.MyPortfolio })));
const CountdownTimer = lazy(() => import('./pages/tools/CountdownTimer').then(m => ({ default: m.CountdownTimer })));
const EduGamesRedirect = lazy(() => import('./pages/EduGamesRedirect').then(m => ({ default: m.EduGamesRedirect })));
const CourseDashboard = lazy(() => import('./pages/elearning/CourseDashboard').then(m => ({ default: m.CourseDashboard })));
const CourseLearn = lazy(() => import('./pages/elearning/CourseLearn').then(m => ({ default: m.CourseLearn })));
const CourseManage = lazy(() => import('./pages/elearning/CourseManage').then(m => ({ default: m.CourseManage })));
const ParentLogin = lazy(() => import('./pages/parent/ParentLogin').then(m => ({ default: m.ParentLogin })));
const ParentDashboard = lazy(() => import('./pages/parent/ParentDashboard').then(m => ({ default: m.ParentDashboard })));
const ParentEvaluations = lazy(() => import('./pages/parent/ParentEvaluations').then(m => ({ default: m.ParentEvaluations })));
const ParentBehavior = lazy(() => import('./pages/parent/ParentBehavior').then(m => ({ default: m.ParentBehavior })));
const ParentExamHistory = lazy(() => import('./pages/parent/ParentExamHistory').then(m => ({ default: m.ParentExamHistory })));

const Login = () => {
  const { setUser, users, siteSettings } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Auto Forgot Password State
  const [forgotInput, setForgotInput] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotResult, setForgotResult] = useState<{
    type: 'success' | 'error' | 'student';
    message: string;
    maskedEmail?: string;
  } | null>(null);

  const maskEmail = (emailStr: string) => {
    if (!emailStr || !emailStr.includes('@')) return emailStr;
    const [name, domain] = emailStr.split('@');
    if (name.length <= 2) return `${name[0]}*@${domain}`;
    const start = name.slice(0, 2);
    const end = name.slice(-2);
    return `${start}${'•'.repeat(Math.max(3, name.length - 4))}${end}@${domain}`;
  };

  const handleOpenForgotPassword = () => {
    const currentInput = email.trim();
    setForgotInput(currentInput);
    setShowForgotPassword(true);
    if (currentInput) {
      triggerResetPassword(currentInput);
    } else {
      setForgotResult(null);
    }
  };

  const triggerResetPassword = async (identifier: string) => {
    const cleanId = identifier.trim().toLowerCase();
    if (!cleanId) {
      setForgotResult({
        type: 'error',
        message: 'Vui lòng nhập Tên đăng nhập hoặc Email của bạn.'
      });
      return;
    }

    setForgotLoading(true);
    setForgotResult(null);

    try {
      // 1. Kiểm tra bảng profiles (Học sinh, Giáo viên, Admin)
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, name, email, role')
        .or(`email.ilike.${cleanId},email.ilike.${cleanId}@openlms.edu,id.eq.${cleanId}`)
        .maybeSingle();

      if (profile) {
        if (profile.role === 'STUDENT') {
          setForgotResult({
            type: 'student',
            message: 'Tài khoản học sinh không sử dụng email để khôi phục. Em vui lòng liên hệ Giáo viên chủ nhiệm để được cấp lại mật khẩu ngay nhé!'
          });
          setForgotLoading(false);
          return;
        }

        // GV hoặc ADMIN
        let targetEmail = profile.email;
        if ((!targetEmail || targetEmail.includes('@openlms.edu')) && profile.role === 'ADMIN' && siteSettings?.email) {
          targetEmail = siteSettings.email;
        }

        if (!targetEmail || !targetEmail.includes('@')) {
          setForgotResult({
            type: 'error',
            message: 'Tài khoản này chưa có địa chỉ email hợp lệ để nhận liên kết khôi phục.'
          });
          setForgotLoading(false);
          return;
        }

        const { error: sendErr } = await supabase.auth.resetPasswordForEmail(targetEmail, {
          redirectTo: `${window.location.origin}/reset-password`
        });

        if (sendErr) {
          setForgotResult({
            type: 'error',
            message: sendErr.message || 'Không thể gửi email. Vui lòng thử lại sau.'
          });
        } else {
          setForgotResult({
            type: 'success',
            maskedEmail: maskEmail(targetEmail),
            message: `Hệ thống đã tự động gửi liên kết đổi mật khẩu đến email đã tạo của bạn. Vui lòng kiểm tra hộp thư đến (và thư mục Thư rác/Spam) để hoàn tất.`
          });
        }
        setForgotLoading(false);
        return;
      }

      // 2. Kiểm tra bảng parents (nếu phụ huynh đăng nhập ở cổng chính)
      const { data: parent } = await supabase
        .from('parents')
        .select('id, name, email, link_code')
        .or(`link_code.ilike.${cleanId},email.ilike.${cleanId},phone.eq.${cleanId}`)
        .maybeSingle();

      if (parent && parent.email) {
        const { error: sendErr } = await supabase.auth.resetPasswordForEmail(parent.email, {
          redirectTo: `${window.location.origin}/reset-password?role=parent`
        });

        if (sendErr) {
          setForgotResult({
            type: 'error',
            message: sendErr.message || 'Lỗi gửi email khôi phục phụ huynh.'
          });
        } else {
          setForgotResult({
            type: 'success',
            maskedEmail: maskEmail(parent.email),
            message: `Hệ thống đã tự động gửi liên kết đổi mật khẩu đến email đã tạo của Phụ huynh.`
          });
        }
        setForgotLoading(false);
        return;
      }

      // 3. Không tìm thấy tài khoản
      setForgotResult({
        type: 'error',
        message: `Không tìm thấy tài khoản tương ứng với "${identifier}". Vui lòng kiểm tra lại Tên đăng nhập hoặc Email.`
      });
    } catch (e: any) {
      console.error("Forgot password error:", e);
      setForgotResult({
        type: 'error',
        message: 'Có lỗi xảy ra khi tìm kiếm tài khoản. Vui lòng thử lại.'
      });
    } finally {
      setForgotLoading(false);
    }
  };

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
          const mappedProfile = {
            ...realProfile,
            className: realProfile.class_name || realProfile.className
          };
          setUser(mappedProfile);
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
            <div className="flex justify-end items-center mt-1">
              <button 
                type="button" 
                onClick={handleOpenForgotPassword}
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
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 animate-fade-in text-left border border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Key className="h-5 w-5 text-indigo-600" /> Khôi phục mật khẩu
                </h3>
                <button 
                  onClick={() => setShowForgotPassword(false)} 
                  className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Status / Results */}
              {forgotLoading ? (
                <div className="py-8 text-center space-y-3">
                  <Loader2 className="h-8 w-8 text-indigo-600 animate-spin mx-auto" />
                  <p className="text-sm font-medium text-gray-600">Đang nhận diện tài khoản và gửi liên kết đổi mật khẩu...</p>
                </div>
              ) : forgotResult?.type === 'success' ? (
                <div className="space-y-4 py-2 text-center">
                  <div className="h-14 w-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-bold text-gray-900 text-base">Đã gửi liên kết thành công!</h4>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Hệ thống đã tự động gửi liên kết đặt lại mật khẩu đến email đã tạo của bạn:
                    </p>
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 font-mono font-bold text-xs p-2.5 rounded-xl inline-block">
                      {forgotResult.maskedEmail}
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed pt-1">
                      Vui lòng mở hộp thư đến (hoặc kiểm tra thư mục <b>Spam / Thư rác</b>) và bấm vào liên kết trong email để đặt mật khẩu mới.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowForgotPassword(false)}
                    className="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-all text-sm mt-2"
                  >
                    Đã hiểu
                  </button>
                </div>
              ) : forgotResult?.type === 'student' ? (
                <div className="space-y-4 py-2">
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-amber-900 text-xs leading-relaxed space-y-2">
                    <div className="font-bold flex items-center gap-2 text-amber-800 text-sm">
                      <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                      Dành cho Học sinh:
                    </div>
                    <p>
                      {forgotResult.message}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowForgotPassword(false)}
                    className="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-all text-sm"
                  >
                    Đã hiểu
                  </button>
                </div>
              ) : (
                <div className="space-y-4 py-1">
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Hệ thống sẽ <b>tự động tra cứu và gửi liên kết đổi mật khẩu</b> tới địa chỉ email đã đăng ký của bạn. Bạn không cần phải nhớ hay gõ lại email.
                  </p>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Tên đăng nhập / Email của bạn
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="admin@school.edu hoặc tên tài khoản"
                        value={forgotInput}
                        onChange={e => setForgotInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            triggerResetPassword(forgotInput);
                          }
                        }}
                        className="w-full border border-gray-300 rounded-xl pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      />
                    </div>
                  </div>

                  {forgotResult?.type === 'error' && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs font-medium flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-500" />
                      <span>{forgotResult.message}</span>
                    </div>
                  )}

                  <div className="pt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(false)}
                      className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl font-bold hover:bg-gray-50 transition-all text-xs"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="button"
                      disabled={!forgotInput.trim()}
                      onClick={() => triggerResetPassword(forgotInput)}
                      className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-all text-xs shadow-md disabled:opacity-50"
                    >
                      Gửi liên kết
                    </button>
                  </div>
                </div>
              )}
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
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/reset-password" element={<ResetPassword />} />

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

        {/* ADMIN & TEACHER SHARED - ACADEMIC YEARS */}
        <Route path="/admin/years" element={
          <ProtectedRoute roles={['ADMIN', 'TEACHER']}>
            <AcademicYearManage />
          </ProtectedRoute>
        } />
        <Route path="/teacher/years" element={
          <ProtectedRoute roles={['ADMIN', 'TEACHER']}>
            <AcademicYearManage />
          </ProtectedRoute>
        } />
        <Route path="/manage/years" element={
          <ProtectedRoute roles={['ADMIN', 'TEACHER']}>
            <AcademicYearManage />
          </ProtectedRoute>
        } />

        {/* ADMIN ONLY ROUTES */}
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
        <Route path="/teacher/notes" element={
          <ProtectedRoute roles={['TEACHER', 'ADMIN']}>
            <TeacherNotes />
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
          <ProtectedRoute roles={['STUDENT', 'TEACHER', 'ADMIN']}>
            <ArenaHome />
          </ProtectedRoute>
        } />
        <Route path="/arena/shop" element={
          <ProtectedRoute roles={['STUDENT', 'TEACHER', 'ADMIN']}>
            <ArenaShop />
          </ProtectedRoute>
        } />
        <Route path="/arena/dashboard" element={
          <ProtectedRoute roles={['STUDENT', 'TEACHER', 'ADMIN']}>
            <ArenaDashboard />
          </ProtectedRoute>
        } />
        <Route path="/arena/tower" element={
          <ProtectedRoute roles={['STUDENT', 'TEACHER', 'ADMIN']}>
            <TowerMode />
          </ProtectedRoute>
        } />
        <Route path="/arena/pvp" element={
          <ProtectedRoute roles={['STUDENT', 'TEACHER', 'ADMIN']}>
            <PvPLobby />
          </ProtectedRoute>
        } />
        <Route path="/arena/battle/:id" element={
          <ProtectedRoute roles={['STUDENT', 'TEACHER', 'ADMIN']}>
            <PvPBattle />
          </ProtectedRoute>
        } />
        <Route path="/arena/result/:id" element={
          <ProtectedRoute roles={['STUDENT', 'TEACHER', 'ADMIN']}>
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

        {/* E-LEARNING ROUTES */}
        <Route path="/elearning" element={
          <ProtectedRoute roles={['STUDENT', 'TEACHER', 'ADMIN']}>
            <CourseDashboard />
          </ProtectedRoute>
        } />
        <Route path="/elearning/course/:id" element={
          <ProtectedRoute roles={['STUDENT', 'TEACHER', 'ADMIN']}>
            <CourseLearn />
          </ProtectedRoute>
        } />
        <Route path="/elearning/manage/:id" element={
          <ProtectedRoute roles={['TEACHER', 'ADMIN']}>
            <CourseManage />
          </ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;

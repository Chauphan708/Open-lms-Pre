import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { Key, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';

export const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const role = searchParams.get('role'); // 'parent' or null

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [checkingSession, setCheckingSession] = useState(true);
  const [isSessionValid, setIsSessionValid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    let mounted = true;

    const verifySession = async () => {
      try {
        // 1. Kiểm tra nếu URL có authorization code (PKCE)
        const code = searchParams.get('code');
        if (code) {
          const { error: codeErr } = await supabase.auth.exchangeCodeForSession(code);
          if (!codeErr && mounted) {
            setIsSessionValid(true);
            setCheckingSession(false);
            return;
          }
        }

        // 2. Kiểm tra session hiện có
        const { data: { session } } = await supabase.auth.getSession();
        if (session && mounted) {
          setIsSessionValid(true);
          setCheckingSession(false);
          return;
        }

        // 3. Kiểm tra hash fragment #access_token=...&type=recovery
        if (window.location.hash && (window.location.hash.includes('type=recovery') || window.location.hash.includes('access_token'))) {
          if (mounted) {
            setIsSessionValid(true);
            setCheckingSession(false);
            return;
          }
        }

        // Nếu không có phiên hợp lệ
        if (mounted) {
          setTimeout(async () => {
            const { data: { session: retrySession } } = await supabase.auth.getSession();
            if (retrySession && mounted) {
              setIsSessionValid(true);
            } else if (mounted) {
              setIsSessionValid(false);
            }
            if (mounted) setCheckingSession(false);
          }, 800);
        }
      } catch (e) {
        console.error("Session verification error:", e);
        if (mounted) {
          setIsSessionValid(false);
          setCheckingSession(false);
        }
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        if (mounted) {
          setIsSessionValid(true);
          setCheckingSession(false);
        }
      }
    });

    verifySession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [searchParams]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setError('Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Cập nhật mật khẩu trong Supabase Auth
      const { data: userData, error: updateErr } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateErr) throw updateErr;

      const userEmail = userData?.user?.email?.toLowerCase().trim();
      const userId = userData?.user?.id;

      // 2. Đồng bộ mật khẩu vào profiles (cho GV/Admin) và parents (cho PH)
      if (userEmail) {
        try {
          if (userId) {
            await supabase.from('profiles').update({ password: newPassword }).eq('id', userId);
          }
          await supabase.from('profiles').update({ password: newPassword }).eq('email', userEmail);
          await supabase.from('parents').update({ password: newPassword }).eq('email', userEmail);
        } catch (dbErr) {
          console.warn("Sync to profiles/parents warning:", dbErr);
        }
      }

      // 3. Đăng xuất phiên recovery để đảm bảo người dùng đăng nhập bằng mật khẩu mới
      await supabase.auth.signOut();

      setIsSuccess(true);
    } catch (err: any) {
      console.error("Password update error:", err);
      setError(err.message || 'Có lỗi xảy ra khi cập nhật mật khẩu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoToLogin = () => {
    if (role === 'parent') {
      navigate('/parent/login', { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-8 border border-gray-100 text-left transition-all">
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="h-14 w-14 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md shadow-indigo-200 text-white">
            <Key className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Đặt Lại Mật Khẩu</h1>
          <p className="text-gray-500 text-xs mt-1">
            {role === 'parent' ? 'Cổng Phụ Huynh Học Sinh' : 'Hệ Thống Quản Lý Học Tập OpenLMS'}
          </p>
        </div>

        {/* Loading state */}
        {checkingSession ? (
          <div className="py-12 text-center space-y-3">
            <Loader2 className="h-8 w-8 text-indigo-600 animate-spin mx-auto" />
            <p className="text-sm font-medium text-gray-500">Đang kiểm tra liên kết xác thực...</p>
          </div>
        ) : isSuccess ? (
          /* Success state */
          <div className="space-y-6 py-4 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-gray-900">Mật khẩu đã được thay đổi!</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                Mật khẩu mới của bạn đã được cập nhật thành công. Bạn có thể sử dụng mật khẩu mới này để đăng nhập ngay bây giờ.
              </p>
            </div>
            <button
              onClick={handleGoToLogin}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 text-sm"
            >
              <span>Đăng nhập ngay</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : !isSessionValid ? (
          /* Invalid session state */
          <div className="space-y-6 py-4 text-center animate-in fade-in duration-200">
            <div className="h-16 w-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="h-10 w-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-gray-900">Liên kết không hợp lệ hoặc đã hết hạn</h2>
              <p className="text-xs text-gray-600 leading-relaxed">
                Liên kết đổi mật khẩu này có thể đã được sử dụng hoặc đã quá thời hạn cho phép. Vui lòng quay lại màn hình đăng nhập và bấm "Quên mật khẩu?" để nhận liên kết mới.
              </p>
            </div>
            <button
              onClick={handleGoToLogin}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold transition-all shadow-md active:scale-95 text-sm"
            >
              Quay lại Đăng nhập
            </button>
          </div>
        ) : (
          /* Password reset form */
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="bg-indigo-50 border border-indigo-100 p-3.5 rounded-xl text-xs text-indigo-900 leading-relaxed flex items-start gap-2.5">
              <Lock className="h-4 w-4 text-indigo-600 flex-shrink-0 mt-0.5" />
              <span>Vui lòng nhập mật khẩu mới có tối thiểu 6 ký tự để bảo vệ tài khoản của bạn.</span>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">
                Mật khẩu mới
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Nhập tối thiểu 6 ký tự..."
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">
                Xác nhận mật khẩu mới
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  placeholder="Nhập lại mật khẩu mới..."
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-500" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 text-sm mt-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{loading ? 'Đang lưu mật khẩu...' : 'Lưu mật khẩu mới'}</span>
            </button>
          </form>
        )}

      </div>
    </div>
  );
};
